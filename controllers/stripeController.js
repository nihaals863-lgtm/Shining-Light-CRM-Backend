const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Organization = require('../models/Organization');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const mongoose = require('mongoose');

// @desc    Create Stripe Checkout Session
// @route   POST /api/stripe/create-checkout-session
// @access  Public
exports.createCheckoutSession = async (req, res) => {
    const { 
        planId, 
        organizationName, 
        adminName, 
        adminEmail, 
        adminPassword, 
        phoneNumber,
        registrationAmount 
    } = req.body;

    try {
        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        if (!plan.stripePriceId && plan.price > 0) {
            return res.status(400).json({ success: false, message: 'Stripe Price ID not configured for this plan' });
        }

        // 1. Check if user already exists
        const existingUser = await User.findOne({ email: adminEmail });
        if (existingUser && existingUser.role === 'admin') {
            // If they are already an admin and active, they shouldn't register again
            const org = await Organization.findById(existingUser.organizationId);
            if (org && org.status === 'Active' && org.paymentStatus === 'Paid') {
                return res.status(400).json({ success: false, message: 'Email already registered and active' });
            }
        }

        // 2. Create/Update Organization and User in "Pending" status
        // This ensures they appear in SuperAdmin dashboard immediately
        let organization;
        let adminUser;

        const sDate = new Date();
        const eDate = new Date();
        if (plan.billingPeriod === 'Yearly') {
            eDate.setFullYear(sDate.getFullYear() + 1);
        } else {
            eDate.setMonth(sDate.getMonth() + 1);
        }

        // Check if there's an existing pending organization for this email
        if (existingUser) {
            adminUser = existingUser;
            organization = await Organization.findById(adminUser.organizationId);
        }

        if (!organization) {
            organization = await Organization.create({
                name: organizationName,
                planId: planId,
                phoneNumber: phoneNumber,
                startDate: sDate,
                expireDate: eDate,
                planType: plan.billingPeriod,
                paymentStatus: 'Pending',
                registrationAmount: registrationAmount,
                status: 'Pending'
            });
        } else {
            // Update existing pending org with new plan info if needed
            organization.planId = planId;
            organization.planType = plan.billingPeriod;
            organization.registrationAmount = registrationAmount;
            await organization.save();
        }

        if (!adminUser) {
            adminUser = await User.create({
                name: adminName,
                email: adminEmail,
                password: adminPassword,
                role: 'admin',
                organizationId: organization._id
            });
            organization.adminUserId = adminUser._id;
            await organization.save();
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: plan.stripePriceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?planId=${planId}`,
            customer_email: adminEmail,
            metadata: {
                organizationId: organization._id.toString(),
                planId: planId.toString(),
            },
        });

        res.status(200).json({ success: true, url: session.url });
    } catch (error) {
        console.error('Stripe Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Handle Stripe Webhook
// @route   POST /api/stripe/webhook
// @access  Public
exports.handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // req.body is raw here because of express.raw in router
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook Signature Verification Failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { organizationId, planId } = session.metadata;

        try {
            const organization = await Organization.findById(organizationId);
            if (organization && organization.paymentStatus !== 'Paid') {
                organization.paymentStatus = 'Paid';
                organization.status = 'Active';
                organization.stripeCustomerId = session.customer;
                organization.stripeSubscriptionId = session.subscription;
                await organization.save();
                
                // Create Subscription record for revenue tracking
                const plan = await SubscriptionPlan.findById(planId);
                await Subscription.create({
                    organizationId: organization._id,
                    planId: plan._id,
                    amount: plan.price,
                    status: 'Active',
                    billingDate: new Date(),
                    stripeSessionId: session.id
                });
                
                console.log(`Organization ${organization.name} marked as Paid via Webhook`);
            }
        } catch (error) {
            console.error('Webhook processing error:', error);
        }
    }
    res.status(200).json({ received: true });
};

// @desc    Verify Stripe Session (Fallback for Webhooks)
// @route   GET /api/stripe/verify-session/:session_id
// @access  Public
exports.verifySession = async (req, res) => {
    const { session_id } = req.params;
    console.log(`Verifying Stripe Session: ${session_id}`);

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id);
        console.log(`Stripe Session Status: ${session.payment_status}`);
        
        if (session.payment_status === 'paid') {
            const { organizationId, planId } = session.metadata;
            
            const organization = await Organization.findById(organizationId);
            if (organization && organization.paymentStatus !== 'Paid') {
                organization.paymentStatus = 'Paid';
                organization.status = 'Active';
                organization.stripeCustomerId = session.customer;
                organization.stripeSubscriptionId = session.subscription;
                await organization.save();

                // Create Subscription record if not exists
                const existingSub = await Subscription.findOne({ organizationId: organization._id });
                if (!existingSub) {
                    const plan = await SubscriptionPlan.findById(planId);
                    await Subscription.create({
                        organizationId: organization._id,
                        planId: plan._id,
                        amount: plan.price,
                        status: 'Active',
                        billingDate: new Date(),
                        stripeSessionId: session.id
                    });
                }
                
                console.log(`Organization ${organization.name} verified and marked as Paid via Frontend Sync`);
            }

            return res.status(200).json({ success: true, payment_status: session.payment_status });
        }

        res.status(200).json({ success: false, payment_status: session.payment_status, message: `Payment Status is ${session.payment_status}` });
    } catch (error) {
        console.error('Verify Session Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
