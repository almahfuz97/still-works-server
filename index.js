const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

// mongoDb uri
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_SECRET}@cluster0.4ilyo9k.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoriesCollection = client.db('still-works').collection('categories');
        const usersCollection = client.db('still-works').collection('users');

        //all get api's
        app.get('/categories', async (req, res) => {
            const query = {};
            const catergories = await categoriesCollection.find(query).toArray();
            res.send(catergories);
        })

        // post api's
        app.post('/users', async (req, res) => {
            const userInfo = req.body;
            console.log(userInfo);
            const query = { email: req.body.email }
            const isFound = await usersCollection.findOne(query);
            if (isFound) return res.send({ message: 'User Already Exist' });

            const result = await usersCollection.insertOne(userInfo);
            res.send(result);
        })

    } catch (error) {
        console.log('run function catch error:', error)
    }
}
run().catch(console.dir)


app.get('/', (req, res) => {
    res.send('Still Works server running')
})


app.listen(port, () => {

    console.log('listening on', port)
})