const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const { query } = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(`${process.env.STRIPE_SECRET}`)

const port = process.env.PORT || 5000;
// middle ware
app.use(cors());
app.use(express.json());

// mongoDb uri
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_SECRET}@cluster0.4ilyo9k.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoriesCollection = client.db('still-works').collection('categories');
        const usersCollection = client.db('still-works').collection('users');
        const productsCollection = client.db('still-works').collection('products');
        const bookedProductsCollection = client.db('still-works').collection('bookedProducts');

        //all get api's
        app.get('/categories', async (req, res) => {
            const query = {};
            const catergories = await categoriesCollection.find(query).toArray();
            res.send(catergories);
        })
        // single category products
        app.get('/category/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { categoryId: id, availability: 'available' };
            const products = await productsCollection.find(query).toArray();
            console.log(products)
            res.send(products);
        })
        // // one user get api
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send(user);
        })

        // // add users post api's
        app.post('/users', async (req, res) => {
            const userInfo = req.body;
            console.log(userInfo);
            const query = { email: req.body.email }
            const isFound = await usersCollection.findOne(query);
            if (isFound) return res.send({ message: 'User Already Exist' });
            const result = await usersCollection.insertOne(userInfo);
            res.send(result);
        })
        // // add products
        app.post('/addproduct', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        })
        // // add booked products 
        app.post('/bookedProducts', async (req, res) => {
            const bookedProduct = req.body;
            console.log(bookedProduct);
            const result = await bookedProductsCollection.insertOne(bookedProduct);
            res.send(result);
        })
        app.post("/create-payment-intent", async (req, res) => {
            const bookingOrder = req.body;
            const price = bookingOrder.resalePrice;
            const amount = price * 100;


            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: price * 100,
                currency: "usd",
                "payment_method_types": [
                    "card"
                ]

            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        // // find a booking for a particular user
        app.get('/bookedProducts/:id', async (req, res) => {
            const id = req.params.id;
            const email = req.headers.email;
            console.log(email, id);
            const query = { customerEmail: email, productId: id };
            const result = await bookedProductsCollection.findOne(query);
            console.log(result);
            if (result) return res.send({ isFound: true })
            res.send({ isFound: false });

        })
        // seller's all products
        app.get('/products/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { sellerEmail: email };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        })
        // all buyers
        app.get('/buyers', async (req, res) => {
            const query = { role: 'Buyer' };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/sellers', async (req, res) => {
            const query = { role: 'Seller' };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/advertisedProducts', async (req, res) => {
            const query = { isAdvertised: true, availability: 'available' };
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })
        // 
        app.get('/myOrders', async (req, res) => {
            const email = req.query.email;
            const query = { customerEmail: email, availability: 'available' };
            const result = await bookedProductsCollection.find(query).toArray();
            console.log(result)
            res.send(result);
        })
        // payment
        app.get('/dashboard/payment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const bookedProduct = await bookedProductsCollection.findOne(query)
            res.send(bookedProduct);
        })
        app.put('/products/advertise/:id', async (req, res) => {
            const id = req.params.id;
            const body = req.body;
            const filter = { _id: ObjectId(id) };
            console.log(body);

            const product = await productsCollection.findOne(filter);
            console.log(product);
            // res.send({ message: 'okai toki' })

            let isAd;
            if (product.isAdvertised) isAd = false
            else isAd = true
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    isAdvertised: isAd
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options);
            console.log(result)

            res.send(result);
        })

        app.put('/users/seller/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const seller = await usersCollection.findOne(filter);

            let isVerify;
            if (seller.isVerified) isVerify = false
            else isVerify = true;
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    isVerified: isVerify
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        app.delete('/users/delete/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const result = await usersCollection.deleteOne(query);
            console.log(result);
            res.send(result);
        })
        // delete a single product
        app.delete('/products/delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            console.log(result);
            res.send(result);
        })
        // delete all products of a specific user if the use gets deleted
        app.delete('/user/products/delete/:email', async (req, res) => {
            const email = req.params.email;
            const query = { sellerEmail: email };
            const result = await productsCollection.deleteMany(query);
            console.log(result);
            res.send(result);
        })

    } catch (error) {
        console.log('run function catch error:', error)
    }
}
run().catch(err => console.log('run or catch error:', err))


app.get('/', (req, res) => {
    res.send('Still Works server running')
})


app.listen(port, () => {
    console.log('listening on', port)
})