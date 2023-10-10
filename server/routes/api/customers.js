const express = require('express');
const mongodb = require('mongodb');

const router = express.Router();

// Change this to your MongoDB connection string
const mongoDBconnectionString = '';

// Get Customers
router.get('/', async (req, res) => {
    const customers = await loadCustomersCollection();
    res.send(await customers.find({}).toArray());
});

// Add Customer
router.post('/', async (req, res) => {
    const customers = await loadCustomersCollection();
    const bybit = {
        shortKey: req.body.shortKey,
        secretKey: req.body.secretKey
    }
    await customers.insertOne({
        name: req.body.name,
        bybit: bybit,
        referral: req.body.referral,
        joinedAt: req.body.joinedAt,
        position: {},
        goose: {}
    });
    res.status(201).send();
});

// Delete Customer
router.delete('/:id', async (req, res) => {
    const customers = await loadCustomersCollection();
    await customers.deleteOne({ _id: new mongodb.ObjectID(req.params.id) })
    res.status(200).send();
});


async function loadCustomersCollection() {
    
    const client = await mongodb.MongoClient.connect(mongoDBconnectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        connectTimeoutMS: 30000
    });

    return client.db('vue_express').collection('customers');
}

module.exports = router;
