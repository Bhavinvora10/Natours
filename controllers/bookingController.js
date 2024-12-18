const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('./../models/tourModel');
const User = require('./../models/userModel');
const Booking = require('../models/bookingModel');
const factory = require('./handleFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    // 1) Get currently booked tour
    const tour = await Tour.findById(req.params.tourId);

    if (!tour) {
        return next(new AppError('No tour found with this ID', 404));
    }

    // 2) Create checkout session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        // success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${
        //     req.params.tourId
        // }&user=${req.user.id}&price=${tour.price}`,
        success_url: `${req.protocol}://${req.get(
            'host'
        )}/my-tours?alert=booking`,
        cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
        customer_email: req.user.email,
        client_reference_id: req.params.tourId,
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${tour.name} Tour`,
                        description: tour.summary,
                        images: [
                            `${req.protocol}://${req.get('host')}/img/tours/${
                                tour.imageCover
                            }`,
                        ],
                    },
                    unit_amount: tour.price * 100, // Convert to cents
                },
                quantity: 1,
            },
        ],
    });

    // 3) Create session as response
    res.status(200).json({
        status: 'success',
        session,
    });
});

// Create Checkout Session in Development Mode
// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//     // This is only Temporary, because it is Unsecure and anyone can make booking without paying
//     const { tour, user, price } = req.query;

//     if (!tour && !user && !price) return next();
//     await Booking.create({ tour, user, price });

//     res.redirect(req.originalUrl.split('?')[0]);
// });

const createBookingCheckout = async (session) => {
    try {
        const tour = session.client_reference_id;
        const user = (await User.findOne({ email: session.customer_email })).id;
        const price = session.amount_total / 100; // Stripe's latest API provides `amount_total`

        await Booking.create({ tour, user, price });
    } catch (err) {
        console.error('Error creating booking:', err);
    }
};

// Create Checkout Session in Production Mode
exports.webhookCheckout = catchAsync(async (req, res) => {
    const signature = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).send(`Webhook error ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        createBookingCheckout(event.data.object);
    }

    res.status(200).json({ received: true });
});

// exports.createBooking = catchAsync(async (req, res) => {
//     const newBooking = await Booking.create(req.body);

//     res.status(201).json({
//         status: 'success',
//         data: {
//             booking: newBooking,
//         },
//     });
// });

// exports.getAllBookings = catchAsync(async (req, res) => {
//     const bookings = await Booking.find();

//     res.status(200).json({
//         status: 'success',
//         results: bookings.length,
//         data: {
//             bookings,
//         },
//     });
// });

// exports.getBooking = catchAsync(async (req, res, next) => {
//     const booking = await Booking.findById(req.params.id);

//     if (!booking) {
//         return next(new AppError('No booking found with that ID', 404));
//     }

//     res.status(200).json({
//         status: 'success',
//         data: {
//             booking,
//         },
//     });
// });

// exports.updateBooking = catchAsync(async (req, res, next) => {
//     const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
//         new: true,
//         runValidators: true,
//     });

//     if (!booking) {
//         return next(new AppError('No booking found with that ID', 404));
//     }

//     res.status(200).json({
//         status: 'success',
//         data: {
//             booking,
//         },
//     });
// });

// exports.deleteBooking = catchAsync(async (req, res, next) => {
//     const booking = await Booking.findByIdAndDelete(req.params.id);

//     if (!booking) {
//         return next(new AppError('No booking found with that ID', 404));
//     }

//     res.status(204).json({
//         status: 'success',
//         data: null,
//     });
// });

// CRUD operations using factory functions
exports.createBooking = factory.createOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
