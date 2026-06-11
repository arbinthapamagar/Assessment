import mongoose from 'mongoose';

const urlSchema = new mongoose.Schema(
    {
        alias: {
            type: String,
            required: true,
            uniqie: true,
        },
        originalUrl: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

export const Url = mongoose.Schema('URL', urlSchema);

const clickSchema = new mongoose.Schema(
    {
        alias: {
            type: String,
            required: true,
            uniqie: true,
        },
    },
    {
        timestamps: true,
    }
);

export const url