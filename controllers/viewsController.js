const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getOverview = catchAsync(async (req, res) => {
    // 1) Get the tour data from collection
    const tours = await Tour.find();

    // 2) Build template
    // overview.pug (build separatoly)

    // 3) Render that template using tour data from step 1
    res.status(200).render('overview', {
        title: 'All tours',
        tours,
    });
});

exports.getTour = catchAsync(async (req, res, next) => {
    const tour = await Tour.findOne({ slug: req.params.slug }).populate({
        path: 'reviews',
        fields: 'review rating user',
    });

    if (!tour) {
        return next(new AppError('There is no tour with that name', 404));
    }

    res.status(200).render('tour', {
        title: `${tour.name} Tour`,
        tour,
    });
});

exports.getLoginForm = async (req, res) => {
    res.status(200).render('login', {
        title: 'Log into your account',
    });
};

exports.getSignUpForm = async (req, res) => {
    res.status(200).render('signup', {
        title: 'Create your account',
    });
};

exports.getAccount = async (req, res) => {
    res.status(200).render('account', {
        title: 'Your account',
    });
};

exports.getMyTours = catchAsync(async (req, res) => {
    // 1) Find all bookings
    const bookings = await Booking.find({ user: req.user.id });

    // 2) Find booked tours from all tours
    const tourIds = bookings.map((el) => el.tour);
    const tours = await Tour.find({ _id: { $in: tourIds } });

    res.status(200).render('overview', {
        title: 'My Tours',
        tours,
    });
});

exports.updateUserData = catchAsync(async (req, res) => {
    const updateUser = await User.findByIdAndUpdate(
        req.user.id,
        {
            name: req.body.name,
            email: req.body.email,
        },
        { new: true, runValidators: true }
    );

    res.status(200).render('account', {
        title: 'Your account',
        User: updateUser,
    });
});
