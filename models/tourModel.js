const mongoose = require('mongoose');
const slugify = require('slugify');

/* CREATING SCHEMA */
const tourSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'A tour must have a name'],
            unique: true,
            trim: true, //Remove White Spaces From Both of Side
            maxlength: [
                40,
                'A tour name must have less or equal then 40 characters',
            ],
            minlength: [
                10,
                'A tour name must have more or equal then 10 characters',
            ],
            // validate: [validator.isAlpha, 'Tour name must only contain characters']
        },
        slug: {
            type: String,
        },
        duration: {
            type: Number,
            required: [true, 'A tour must have a duration'],
        },
        maxGroupSize: {
            type: Number,
            required: [true, 'A tour must have a group size'],
        },
        difficulty: {
            type: String,
            required: [true, 'A tour must have a difficulty'],
            enum: {
                values: ['easy', 'medium', 'difficult'],
                message: 'Difficulty is either easy, medium, difficult',
            },
        },
        ratingsAverage: {
            type: Number,
            default: 4.5,
            min: [1.0, 'Ratings must be above 1.0'],
            max: [5.0, 'Ratings must be below 5.0'],
            set: function (val) {
                return Math.round(val * 10) / 10;
            },
        },
        ratingsQuantity: {
            type: Number,
            default: 0,
        },
        price: {
            type: Number,
            required: [true, 'A tour must have a price'],
        },
        priceDiscount: {
            type: Number,
            validate: {
                validator: function (val) {
                    //Here this keyword only points to the current proceced document
                    return val < this.price;
                },
                message: 'Discount price {VALUE} should be below regular price',
            },
        },
        summary: {
            type: String,
            trim: true,
            required: [true, 'A tour must have a discription'],
        },
        description: {
            type: String,
            trim: true,
        },
        imageCover: {
            type: String,
            required: [true, 'A tour must have a cover image'],
        },
        images: [String],
        createdAt: {
            type: Date,
            default: Date.now(),
            select: false,
        },
        startDates: [Date],
        secretTour: {
            type: Boolean,
            default: false,
        },
        startLocation: {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point'],
            },
            coordinates: [Number],
            address: String,
            description: String,
        },
        locations: [
            {
                type: {
                    type: String,
                    default: 'Point',
                    enum: ['Point'],
                },
                coordinates: [Number],
                address: String,
                description: String,
                day: Number,
            },
        ],
        guides: [
            {
                type: mongoose.Schema.ObjectId,
                ref: 'User',
            },
        ],
    },
    {
        toJSON: {
            virtuals: true,
        },
        toObject: {
            virtuals: true,
        },
    }
);

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

/* VIRTUAL PROPERTY */
tourSchema.virtual('durationWeeks').get(function () {
    return this.duration / 7;
});

/* VIRTUAL POPULATE */
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id',
});

/* DOCUMENT MIDDLEWARE: runs before .save() and .create() */
tourSchema.pre('save', function (next) {
    // console.log(this);
    this.slug = slugify(this.name, { lower: true });
    next();
});

// For modelling tour guides embedding
// tourSchema.pre('save', async function(next) {
//     const guidesPromises = this.guides.map(async id => await User.findById(id));
//     this.guides = await Promise.all(guidesPromises);
//     next();
// });

// tourSchema.pre('save', function(next) {
//     console.log("Will save document...");
//     next();
// });

// tourSchema.post('save', function(doc, next) {
//     console.log(doc);
//     next();
// });

/* QUERY MIDDLEWARE */
// 1) For Only Find
// tourSchema.pre('find', function(next) {

// 2) For Only FindOne
tourSchema.pre(/^find/, function (next) {
    this.find({ secretTour: { $ne: true } });
    this.start = Date.now();
    next();
});

tourSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt',
    });
    next();
});

// tourSchema.post(/^find/, function (docs, next) {
//     console.log(`Query took ${Date.now() - this.start} milliseconds!`);
//     next();
// });

/* AGGREGATION MIDDLEWARE */
// tourSchema.pre('aggregate', function (next) {
//     this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//     console.log(this.pipeline());
//     next();
// });

/* CREATING MODEL */
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
