const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handleFactory');
const AppError = require('../utils/appError');
const multer = require('multer');
const sharp = require('sharp');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(
            new AppError('Not an image! Please upload only images.', 404),
            false
        );
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
    { name: 'imageCover', maxCount: 1 },
    { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    if (!req.files.imageCover || !req.files.images) return next();

    // 1) Cover image
    const imageCoverFilename = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${imageCoverFilename}`);

    req.body.imageCover = imageCoverFilename;

    // 2) Images (array of 3 image)
    req.body.images = []; // Clear existing images array

    await Promise.all(
        req.files.images.map(async (file, index) => {
            const filename = `tour-${req.params.id}-${Date.now()}-${
                index + 1
            }.jpeg`;

            await sharp(file.buffer)
                .resize(2000, 1333)
                .toFormat('jpeg')
                .jpeg({ quality: 90 })
                .toFile(`public/img/tours/${filename}`);

            req.body.images.push(filename);
        })
    );

    next();
});

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
};

/* Handling POST Request */
/* CATCHING ERRORS IN ASYNC FUNCTIONS */
exports.createTour = factory.createOne(Tour);

// exports.createTour = catchAsync (async (req, res, next) => {
//     const newTour = await Tour.create(req.body);

//     res.status(201) // 200=OK, 201=Created
//     res.json({
//         status: 'success',
//         data: {
//            tour: newTour
//         }
//     });
// });

/* Handling GET Request */
exports.getAllTours = factory.getAll(Tour);

// exports.getAllTours = catchAsync (async (req, res, next) => {
//     const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//     const tours = await features.query;
//     // const tours = await Tour.find()
//     //     .where('duration')
//     //     .equals(5)
//     //     .where('difficulty')
//     //     .equals('easy');

//     res.status(200)
//     res.json({
//         status: 'success',
//         results: tours.length,
//         data: {
//             tours
//         }
//     });
// });

/* Responding to URL Parameters */
exports.getTour = factory.getOne(Tour, { path: 'reviews' });

// exports.getTour = catchAsync (async (req, res, next) => {
//     const tour = await Tour.findById(req.params.id).populate('reviews');

//     if (!tour) {
//         return next(new AppError('No tour found with this ID', 404))
//     }

//     res.status(200)
//     res.json({
//         status: 'success',
//         data: {
//             tour
//         }
//     });
// });

/* Handling PATCH Requests */
exports.updateTour = factory.updateOne(Tour);

// exports.updateTour = catchAsync (async (req, res, next) => {
//     const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//         new: true,
//         runValidators: true
//     });

//     if (!tour) {
//         return next(new AppError('No tour found with this ID', 404))
//     }

//     res.status(200)
//     res.json({
//         status: 'success',
//         data: {
//             tour
//         }
//     });
// });

/* Handling DELETE Requests */
exports.deleteTour = factory.deleteOne(Tour);

// exports.deleteTour = catchAsync (async (req, res, next) => {
//     const tour = await Tour.findByIdAndDelete(req.params.id);

//     if (!tour) {
//         return next(new AppError('No tour found with this ID', 404))
//     }

//     res.status(204) // 204 = No Content
//     res.json({
//         status: 'success',
//         data: null
//     });
// });

/* Aggregation Pipeline Matching and Grouping */

exports.getTourStats = catchAsync(async (req, res) => {
    const stats = await Tour.aggregate([
        {
            $match: { ratingsAverage: { $gte: 4.5 } },
        },
        {
            $group: {
                // _id: null,
                // _id: '$ratingsAverage',
                // _id: '$difficulty',
                _id: { $toUpper: '$difficulty' },
                numTours: { $sum: 1 },
                numRatings: { $sum: '$ratingsQuantity' },
                avgRating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' },
            },
        },
        {
            $sort: { avgPrice: 1 },
        },
        // REPEAT THE STAGE
        // {
        //     $match: { _id: { $ne: 'EASY' } } //$ne = not equal to
        // }
    ]);

    res.status(200);
    res.json({
        status: 'success',
        data: {
            stats,
        },
    });
});

/* Aggregation Pipeline Unwinding and Projecting */

exports.getMonthlyPlan = catchAsync(async (req, res) => {
    const year = req.params.year * 1;

    const plan = await Tour.aggregate([
        {
            $unwind: '$startDates',
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`),
                },
            },
        },
        {
            $group: {
                _id: { $month: '$startDates' },
                numTourStarts: { $sum: 1 },
                tours: { $push: '$name' },
            },
        },
        {
            $addFields: { month: '$_id' },
        },
        {
            $project: {
                _id: 0,
            },
        },
        {
            $sort: { numTourStarts: -1 },
        },
        {
            $limit: 12,
        },
    ]);

    res.status(200);
    res.json({
        status: 'success',
        data: {
            plan,
        },
    });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    if (!lat || !lng) {
        next(
            new AppError(
                'Please provide latitude and longitude in the format lat,lng.',
                400
            )
        );
    }

    const tours = await Tour.find({
        startLocation: {
            $geoWithin: {
                $centerSphere: [[lng, lat], radius],
            },
        },
    });

    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            tours,
        },
    });
});

exports.getDistances = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

    if (!lat || !lng) {
        next(
            new AppError(
                'Please provide latitude and longitude in the format lat,lng.',
                400
            )
        );
    }

    const distance = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng * 1, lat * 1],
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier,
            },
        },
        {
            $project: {
                distance: 1, // Only show distance in the results
                name: 1, // You can project other fields if necessary
            },
        },
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            distance,
        },
    });
});
