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

async function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    console.log(authHeader)
    if (!authHeader) return res.status(401).send({ message: 'unauthorized access' })
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
        if (err) return res.status(403).send({ message: 'forbidden access' });
        req.decoded = decoded;
        next();
    })
}

// mongoDb uri
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_SECRET}@cluster0.4ilyo9k.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoriesCollection = client.db('still-works').collection('categories');
        const usersCollection = client.db('still-works').collection('users');
        const productsCollection = client.db('still-works').collection('products');
        const bookedProductsCollection = client.db('still-works').collection('bookedProducts');
        const paymentsCollection = client.db('still-works').collection('payments');
        const wishlistCollection = client.db('still-works').collection('wishlist');

        // jwt token
        app.get('/jwt', async (req, res) => {
            const email = req.headers.email;
            const filter = { email: email }
            const user = await usersCollection.findOne(filter);

            if (user) {
                const token = jwt.sign(email, process.env.JWT_SECRET);
                return res.send({ token });
            }
            res.status(403).send({ token: '' })

        })
        //all get api's
        app.get('/categories', async (req, res) => {

            const query = {};
            const catergories = await categoriesCollection.find(query).toArray();
            res.send(catergories);
        })
        // single category products
        app.get('/category/:id', async (req, res) => {
            const id = req.params.id;
            const query = { categoryId: id, availability: 'available' };
            const products = await productsCollection.find(query).toArray();

            res.send(products);
        })
        // // one user get api
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send(user);
        })
        // // find a booking for a particular user to check if booking already exist or not
        app.get('/bookedProducts/:id', async (req, res) => {
            const id = req.params.id;
            const email = req.headers.email;
            const query = { customerEmail: email, productId: id };
            const result = await bookedProductsCollection.findOne(query);

            if (result) return res.send({ isFound: true })
            res.send({ isFound: false });

        })
        // seller's all products
        app.get('/products/seller/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded;
            if (!decodedEmail === email) return res.status(403).send({ message: 'forbidden access' })

            const query = { sellerEmail: email };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        })
        // all buyers
        app.get('/buyers', verifyJWT, async (req, res) => {
            const query = { role: 'Buyer' };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/sellers', async (req, res) => {
            const query = { role: 'Seller' };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/verify-seller', async (req, res) => {
            const email = req.headers.useremail;

            const query = { role: 'Seller', email: email };
            const result = await usersCollection.find(query).toArray();

            res.send(result);
        })
        app.get('/admin', async (req, res) => {
            const email = req.headers.email;
            const query = { role: 'admin', email: email };
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
            const query = { customerEmail: email, $or: [{ availability: 'available' }, { isPaid: true }] };
            const result = await bookedProductsCollection.find(query).toArray();

            res.send(result);
        })
        // payment
        app.get('/dashboard/payment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const bookedProduct = await bookedProductsCollection.findOne(query)
            res.send(bookedProduct);
        })

        // single wishlist check
        app.get('/wishlist/:email', async (req, res) => {
            const email = req.params.email;
            const productId = req.headers.productid;
            const query = { customerEmail: email, productId }
            const result = await wishlistCollection.findOne(query)

            if (result) return res.send({ isFound: true });
            res.send({ isFound: false });
        })
        // get all wishlist
        app.get('/mywishlist/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded;

            if (decodedEmail !== email) return res.status(403).send({ message: 'forbidden access' })

            console.log(email)
            const query = { customerEmail: email };
            const wishlistedItems = await wishlistCollection.find(query).toArray();
            res.send(wishlistedItems)
            // console.log(wishlistedItems.length)
            // let products = [];
            // wishlistedItems.map(async (item, i) => {
            //     const query = { _id: ObjectId(item.productId) }
            //     const result = await productsCollection.findOne(query);
            //     products.push(result)
            //     if (i === wishlistedItems.length) {

            //         return res.send(products)
            //     }

            // })

        })
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.send(product);
        })
        // // add users post api's
        app.post('/users', async (req, res) => {
            const userInfo = req.body;

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
        // paymentss
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const productId = payment.productId
            const result = await paymentsCollection.insertOne(payment);
            const bookingId = payment.bookingId;
            const filter = { _id: ObjectId(bookingId) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    isPaid: true,
                    transactionId: payment.transactionId,
                    availability: 'sold'
                }
            }
            const updatedAvailability = {
                $set: {
                    availability: 'sold'
                }
            }

            const filterProduct = { _id: ObjectId(productId) };
            const availabilityResult = await productsCollection.updateOne(filterProduct, updatedAvailability);

            const updatedResult = await bookedProductsCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        // wishlist toggle
        app.post('/wishlist', async (req, res) => {
            const productInfo = req.body;
            const email = productInfo.customerEmail;
            const query = { customerEmail: email, productId: productInfo.productId };
            const isFound = await wishlistCollection.findOne(query);

            if (isFound) {
                const result = await wishlistCollection.deleteOne(query);
                res.send(result);
            }
            else {
                const result = await wishlistCollection.insertOne(productInfo);
                res.send(result);
            }

        })

        // put
        app.put('/products/advertise/:id', async (req, res) => {
            const id = req.params.id;
            const body = req.body;
            const filter = { _id: ObjectId(id) };


            const product = await productsCollection.findOne(filter);

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

            res.send(result);
        })
        // delete a single product
        app.delete('/products/delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);

            res.send(result);
        })
        // delete all products of a specific user if the use gets deleted by admin
        app.delete('/user/products/delete/:email', async (req, res) => {
            const email = req.params.email;
            const query = { sellerEmail: email };
            const result = await productsCollection.deleteMany(query);

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
    console.log('listening to ', port)
})