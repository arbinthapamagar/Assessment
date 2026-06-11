import mongoose from 'mongoose';

// this is the main table that holds url <-> alias mapping
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
        // keeping a running total here so i dont have to run count() every time the list loads
        totalClicks: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// separate doc per click so i can do the 7-day grouping easily in mongo aggregation
// tried doing it with just an array on the url doc but querying was a pain
const clickSchema = new mongoose.Schema(
    {
        alias: {
            type: String,
            required: true,
            index: true,
        },
    },
    { timestamps: true } // createdAt is basically the click timestamp
);

export const Url = mongoose.model('Url', urlSchema);
export const Click = mongoose.model('Click', clickSchema);
