const { MongoClient } = require( 'mongodb' );
require( 'dotenv' ).config();
const express = require( 'express' );
const cors = require( 'cors' );
const app = express();
const port = process.env.PORT || 5000;
var admin = require( "firebase-admin" );

//Firebase admin initialization
var serviceAccount = require( './ema-john-simple-firebase-adb1b-firebase-adminsdk-9xbh4-cfeae97d26.json' );

admin.initializeApp( {
    credential: admin.credential.cert( serviceAccount )
} );


//middleware
app.use( cors() );
app.use( express.json() );

const uri = `mongodb+srv://${ process.env.DB_USER }:${ process.env.DB_PASS }@cluster0.iezc6.mongodb.net/${ process.env.DATABASE }?retryWrites=true&w=majority`;
const client = new MongoClient( uri, { useNewUrlParser: true, useUnifiedTopology: true } );

async function verifyToken ( req, res, next ) {
    if ( req?.headers?.authorization?.startsWith( 'Bearer ' ) ) {
        const idToken = req.headers.authorization.split( 'Bearer ' )[ 1 ];
        try {
            const decodedUser = await admin.auth().verifyIdToken( idToken );
            req.decodeUserEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

const run = async () => {
    try {
        await client.connect();
        console.log( 'database connected' );
        const database = client.db( 'online_shop' );
        const productCollection = database.collection( 'products' );
        const orderCollection = database.collection( 'orders' );

        //GET Products API
        app.get( '/products', async ( req, res ) => {
            const cursor = productCollection.find( {} );
            const currentPage = req.query.page;
            const pageSize = parseInt( req.query.size );
            const count = await cursor.count();
            let products;

            if ( currentPage ) {
                products = await cursor.skip( currentPage * pageSize ).limit( pageSize ).toArray();
            }
            else {
                products = await cursor.toArray();
            }

            res.send( {
                count,
                products
            } );
        } );

        //Use POST to get data by keys
        app.post( '/products/byKeys', async ( req, res ) => {
            const keys = req.body;
            const query = { key: { $in: keys } };
            const products = await productCollection.find( query ).toArray();
            res.json( products );
        } );

        //GET Orders API
        app.get( '/orders', verifyToken, async ( req, res ) => {
            const email = req.query.email;

            if ( req.decodedUserEmail === email ) {
                const query = { email: email };
                const cursor = orderCollection.find( query );
                const orders = await cursor.toArray();
                res.json( orders );
            }
            else {
                res.status( 401 ).json( { message: 'User not authorized' } );
            }

        } )

        //Add Orders API
        app.post( '/orders', async ( req, res ) => {
            const order = req.body;
            order.createdAt = new Date();
            const result = await orderCollection.insertOne( order );
            res.json( result );
        } )
    }
    finally {
        // client.close();
    }
}

run().catch( console.dir );

app.get( '/', ( req, res ) => {
    res.send( 'Ema Jon Server is Running' );
} );

app.listen( port, () => {
    console.log( 'Ema Jon Server is Running at Port: ', port );
} );