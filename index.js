const { MongoClient } = require( 'mongodb' );
require( 'dotenv' ).config();
const express = require( 'express' );
const cors = require( 'cors' );
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use( cors() );
app.use( express.json() );

const uri = `mongodb+srv://${ process.env.DB_USER }:${ process.env.DB_PASS }@cluster0.iezc6.mongodb.net/${ process.env.DATABASE }?retryWrites=true&w=majority`;
const client = new MongoClient( uri, { useNewUrlParser: true, useUnifiedTopology: true } );

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

        //Add Orders API
        app.post( '/orders', async ( req, res ) => {
            const order = req.body;
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