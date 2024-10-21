const mongoose = require('mongoose');
const dotenv = require('dotenv');

/* CATCHING UNCAUGHT EXCEPTIONS */
process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
    // server.close(() => {
    // process.exit(1); //0 stands for success & 1 stands for uncaught exception
    // });
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
);

mongoose
    .connect(DB, {
        useNewUrlParser: true,
        // useCreateIndex: true,
        // useFindAndModify: false,
        useUnifiedTopology: true,
    })
    .then(() => console.log('DB connection successful!'));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});

// process.setMaxListeners(0)

/* ERRORS OUTSIDE EXPRESS UNHANDLED REJECTIONS */
process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);

    server.close(() => {
        process.exit(1); //0 stands for success & 1 stands for uncaught exception
    });
});
