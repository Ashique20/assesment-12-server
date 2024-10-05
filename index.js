const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config();

const jwt = require("jsonwebtoken");

const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

app.use(cors())
app.use(express.json())


const uri = "mongodb+srv://blood_server:aq3s5tvBvtDP2znq@cluster0.0b46zlg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {

    const userCollection = client.db('bloodDb').collection('users')
    const donationCollection = client.db('bloodDb').collection('donations')
    const fundCollection = client.db('bloodDb').collection('funds')
    const blogCollection = client.db('bloodDb').collection('blogs')
    const chatCollection = client.db('bloodDb').collection('chats')

    const verifyToken=(req,res,next)=>{
      console.log(req.headers.authorization)
      if(!req?.headers?.authorization){
        return res.status(401).send({message:'forbidden access'})
      }
      const token = req.headers.authorization.split(' ')[1]
    jwt.verify(token,process.env.ACCESS_TOKEN,(err,decoded)=>{
      if(err){
        return res.status(401).send({message:'forbidden access'})
      }
      req.decoded =decoded
      next()
    })


   
    }

    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN,{expiresIn:'1h'})
      res.send({token})
    })

    app.get("/users",  async (req, res) => {
      
     
      let query = {};
     
      if (req.query?.email) {
        query.email = req.query.email;
      }
      if (req.query?.district) {
        query.district = req.query.district;
      }
      if (req.query?.upazila) {
        query.upazila = req.query.upazila;
      }
      if (req.query?.blood) {
        query.blood_group = req.query.blood;
      }

      if (query.email && req.decoded.email !== query.email) {
        return res.status(403).send({ message: "Forbidden access: email mismatch" });
      }

      console.log(query.email,'email')
      const cursor = userCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });


 


    app.post('/blogs', async (req, res) => {
      const body = req.body
      const result = await blogCollection.insertOne(body)
      res.send(result)

    })
    app.get('/blogs', async (req, res) => {
      const result = await blogCollection.find({}).toArray()
      res.send(result)
    })

    app.patch('/blogs/:id', async (req, res) => {
      const body = req.body;
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          status: body.status
        }
      }
      const result = await blogCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.delete('/blogs/:id', async (req, res) => {

      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const result = await blogCollection.deleteOne(filter)
      res.send(result)
    })

    app.post("/create-payment-intent", async (req, res) => {
      const { amount } = req.body; 

      if (!amount || isNaN(amount)) {
        return res.status(400).send({ error: "Invalid amount" });
      }

      const totalAmount = Math.round(amount * 100); // Convert to cents

      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'usd',
        payment_method_types: ['card'],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.patch('/users/:id', async (req, res) => {
      const body = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      // Dynamically build the updateDoc object
      const updateDoc = {
        $set: {}
      };

      if (body.status) {
        updateDoc.$set.status = body.status;
      }

      if (body.role) {
        updateDoc.$set.role = body.role;
      }

      const result = await userCollection.updateOne(filter, updateDoc);

      if (result.modifiedCount > 0) {
        res.status(200).send({ message: 'User updated successfully', result });
      } else {
        res.status(400).send({ message: 'No changes made or user not found' });
      }
    });



    app.put('/users/:id', async (req, res) => {
      const id = req.params.id
      const body = req.body
      const filter = { _id: new ObjectId(id) }
      const option = { upsert: true };

      const updateDoc = {
        $set: {
          displayName: body.displayName,
          blood_group: body.blood_group,
          district: body.district,
          upazila: body.upazila,
          image:body.image
        }
      }
      const result = await userCollection.updateOne(filter, updateDoc, option)
      res.send(result)
    })



    app.post('/users', async (req, res) => {
      const users = req.body
      const result = await userCollection.insertOne(users)
      res.send(result)
    })

    app.get('/donations', async (req, res) => {
      const queryEmail = req.query.email
      if (queryEmail) {
        const filter = {
          requester_email: queryEmail
        }
        const result = await donationCollection.find(filter).toArray()
        return res.send(result)
      }
      else {
        const result = await donationCollection.find({}).toArray()
        return res.send(result)
      }
    })

    app.post('/donations', async (req, res) => {
      const body = req.body
      const result = await donationCollection.insertOne(body)
      res.send(result)
    })
    app.get('/donations/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const result = await donationCollection.findOne(filter)
      res.send(result)
    })
    app.patch('/donations/:id', async (req, res) => {
      const body = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      // Dynamically building the update document
      const updateDoc = {
        $set: {}
      };

      // Add all fields that exist in the request body to $set object
      if (body.recipient_name) {
        updateDoc.$set.recipient_name = body.recipient_name;
      }
      if (body.recipient_district) {
        updateDoc.$set.recipient_district = body.recipient_district;
      }
      if (body.recipient_upazila) {
        updateDoc.$set.recipient_upazila = body.recipient_upazila;
      }
      if (body.hospital_name) {
        updateDoc.$set.hospital_name = body.hospital_name;
      }
      if (body.full_address_line) {
        updateDoc.$set.full_address_line = body.full_address_line;
      }
      if (body.donation_date) {
        updateDoc.$set.donation_date = body.donation_date;
      }
      if (body.donation_time) {
        updateDoc.$set.donation_time = body.donation_time;
      }
      if (body.request_message) {
        updateDoc.$set.request_message = body.request_message;
      }
      if (body.donation_status) {
        updateDoc.$set.donation_status = body.donation_status;
      }

      // Perform the update operation
      const result = await donationCollection.updateOne(filter, updateDoc);
      res.send(result);
    });





    app.put('/donations/:id', async (req, res) => {
      const body = req.body
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          donation_status: body.donation_status

        }
      }
      const result = await donationCollection.updateOne(filter, updateDoc, option);
      res.send(result);
    })


    app.delete('/donations/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const result = await donationCollection.deleteOne(filter)
      res.send(result)

    })

    app.post('/funds', async (req, res) => {
      const body = req.body
      const result = await fundCollection.insertOne(body)
      res.send(result)
    })

    app.post('/chat',async(req,res)=>{
      const body = req.body
      const result = await chatCollection.insertOne(body)
      res.send(result)
    })

    app.get('/chat',async(req,res)=>{
      const result = await chatCollection.find({}).toArray()
      res.send(result)

    })

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Blood is Running')
})

app.listen(port, () => {
  console.log('kortese kaaj')

})