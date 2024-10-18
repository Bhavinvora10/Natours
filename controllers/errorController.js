/* GLOBAL ERROR HANDLING MIDDLEWARE */

const AppError = require('./../utils/appError');

const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    const value = err.keyValue.name;
    console.log(value);

    const message = `Duplicate field value: ${value}, Please use another value!`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);
    // const errors = Object.values(err.errors).map(value => value.message);
    // console.log(errors);

    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJWTError = () =>
    new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
    new AppError('Your token has expired. Please log in again!', 401);

const sendErrorDev = (err, req, res) => {
    // 1) APIs
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack,
        });
    }
    // 2) RENDERED WEBSITE
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong',
        msg: err.message,
    });
};

const sendErrorProd = (err, req, res) => {
    // A) APIs
    if (req.originalUrl.startsWith('/api')) {
        // 1) Operational, Trusted error: send msg to client
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message,
            });
        }
        // 2) Programming or other unknown error: don't leak error details
        // i) Log Error
        console.error('Error', err);
        // ii) Send generic message
        return res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!',
        });
    }
    // B) RENDERED WEBSITE
    // 1) Operational, Trusted error: send msg to client
    if (err.isOperational) {
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong',
            msg: err.message,
        });
    }
    // 2) Programming or other unknown error: don't leak error details
    // i) Log Error
    console.error('Error', err);
    // ii) Send generic message
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong',
        msg: 'Please try again later.',
    });
};

module.exports = (err, req, res, next) => {
    // console.log(err.stack);

    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === 'production') {
        /* HANDLING INVALID DATABASE IDs */
        let error = { ...err };
        error.message = err.message;

        if (err.name === 'CastError') {
            error = handleCastErrorDB(error);
        }

        /* HANDLING DUPLICATE DATABSE FIELDS */
        if (err.code === 11000) {
            error = handleDuplicateFieldsDB(error);
        }

        /* HANDLING MONGOOSE VALIDATION ERRORS */
        if (err.name === 'ValidationError') {
            error = handleValidationErrorDB(error);
        }

        /* HANDLING JSON WEB TOKEN ERROR */
        if (err.name === 'JsonWebTokenError') {
            error = handleJWTError();
        }

        /* HANDLING EXPIRED TOKEN ERROR */
        if (err.name === 'TokenExpiredError') {
            error = handleJWTExpiredError();
        }

        sendErrorProd(error, req, res);
    }
};
