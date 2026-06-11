import mongoose from 'mongoose';

// this stores the actual url and its short alias
const urlSchema = new mongoose.Schema(
    {
        alias: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        originalUrl: {
            type: String,
            required: true,
        },
        // keeping total here so i dont have to run aggregate every time the list loads
        totalClicks: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// every click gets its own doc so querying by date is easy
// tried using array on url doc first but quering was honestly painful
const clickSchema = new mongoose.Schema(
    {
        alias: {
            type: String,
            required: true,
            index: true,
        },
    },
    { timestamps: true } // createdAt is the click time
);

export const Url = mongoose.model('Url', urlSchema);
export const Click = mongoose.model('Click', clickSchema);
