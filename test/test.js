const assert = require ( 'assert' )
const gravcrud = require ( '../gravsdk/gravcrud' )
const crud = new gravcrud.HTTPCRUD( 'http://127.0.0.1:8181', true )
const express = require( 'express' )
const bodyParser = require('body-parser')

const app = express()
let server;

function setupExpress() {
	app.use ( bodyParser.json() )
	
	app.get( '/rest/orders', ( req, res ) => {
		res.json({
			success: true,
			orders: [
				{ ORDER_NUM: 1 },
				{ ORDER_NUM: 2 },
			]
		} )
	} )
	
	app.post( '/rest/orders', ( req, res ) => {
		let body = req.body
		body.id = 1
		res.json({
			success: true,
			order: body,
		} )
	} )
	
	app.get( '/rest/not-json', ( req, res ) => {
		res.send( '<h1>not json... shhh</h1>' )
		res.end()
	} )
	
	app.use ( bodyParser.json() )
	server = app.listen( 8181 )
}

describe ( 'GRAVCRUD Tests', () => {
	
	before ( () => {
		setupExpress()
	} )
	
	it ( 'read test', async () => {
		const result = await crud.read( 'orders', {} )
		
		assert( result.success, 'success false or not found' )
		assert ( result.orders.length === 2, `expected 2, but for ${result.orders.length}` )
	} )
	
	it ( 'create test', async() => {
		const result = await crud.create( 'orders', {
			'ORDER_NUM': 567,
		} )
		
		assert ( result.success, 'success false or not found' )
		assert ( result.order, `expected 'border', but not found` )
		assert ( result.order.id == 1, `expected order.id of '1'` )
		assert ( result.order.ORDER_NUM === 567, `expected returned ORDER_NUM of '567'` )
	} )
	
	it ( 'unexpected data test', async () => {
		try {
			await crud.create( 'not-json' )
		}
		catch ( e ) {
			assert ( e instanceof gravcrud.GravJSONValueError, `expected GravJSONValueError, got ${e}` )
		}
	} );
	
	after( () => {
		server.close()
	} )
} )
