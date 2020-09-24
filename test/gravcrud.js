const assert = require ( 'assert' )
const expect = require ( 'expect' )
const gravcrud = require ( '../gravsdk/gravcrud' )
const crud = new gravcrud.HTTPCRUD( 'http://127.0.0.1:8181', true )
const express = require( 'express' )
const bodyParser = require('body-parser')

const app = express()
let server;

let db = {
	orders: {
		_inc: 3,
		rows: {
			"1": { id: 1, ORDER_NUM: 1 },
			"2": { id: 2, ORDER_NUM: 2 },
		}
	}
}

function setupExpress() {
	
	var success = ( res, rows ) => {
		res.json({
			success: true,
			rows: rows
		});
		res.end();
	};
	
	var failure = ( res, error ) => {
		res.json({
			success: false,
			error: error
		});
		res.end();
	};
	
	app.use ( bodyParser.json() )
	//app.use ( bodyParser.urlencoded() )
	
	app.get( '/rest/orders', ( _, res ) => {
		success ( res, Object.values ( db.orders.rows ) )
	} )
	
	app.post( '/rest/orders', ( req, res ) => {
		let body = req.body
		body.id = db.orders._inc++
		db.orders.rows[body.id] = body
		success ( res, [body] )
	} )
	
	app.patch( '/rest/orders/:id', ( req, res ) => {
		let order = db.orders.rows[ req.params.id ]
		if ( !order ) {
			failure ( res, `order id '${req.params.id}' not found` );
			return;
		}
		
		let id = order.id
		order = Object.assign( order, req.body )
		order.id = id
		success ( res, [order] )
	} )
	
	app.delete( '/rest/orders/:id', ( req, res ) => {
		if ( !( req.params.id in db.orders.rows ) ) {
			failure ( res, `order id '${req.params.id}' not found` );
			return;
		}
		delete db.orders.rows[ req.params.id ]
		success ( res, [] )
	} )
	
	app.get( '/rest/not-json', ( _, res ) => {
		res.send( '<h1>not json... shhh</h1>' )
		res.end()
	} )
	
	
	server = app.listen( 8181 )
}

describe ( 'GRAVCRUD Tests', () => {
	
	before ( () => {
		setupExpress()
	} )
	
	describe ( 'Core CRUD Tests', () => {
		it ( 'read test', async () => {
			const result = await crud.read ( 'orders', {} )
			
			expect ( result.success ).toBe ( true )
			assert ( result.rows.length === 2, `expected 2, but for ${result.rows.length}` )
		} )
		
		it ( 'create test', async () => {
			const result = await crud.create ( 'orders', {
				'ORDER_NUM': 567,
			} )
			
			expect ( result.success ).toBe( true )
			expect ( result.rows ).toBeDefined()
			const row = result.rows[0]
			expect ( row.id ).toEqual( 3 )
			expect ( row.ORDER_NUM ).toEqual ( 567 )
		} )
		
		it ( 'update test',  async () => {
			const result = await crud.update ( 'orders/1', {
				'foo': 'bar',
			} )
			
			const row = result.rows[0]
			
			expect ( row.foo ).toEqual ( 'bar' )
			expect ( row.ORDER_NUM ).toEqual ( 1 )
		} )
		
		it ( 'delete test', async() => {
			const resultSuccess = await crud.delete ( 'orders/3' )
			
			expect ( resultSuccess.success ).toEqual ( true )
			
			const resultFail = await crud.delete ( 'orders/3' )
			
			expect ( resultFail.success ).toEqual ( false )
		} )
	} )
	
	describe ( 'CRUD Edgecase Tests', () => {
		
		it ( 'unexpected data test', async () => {
			try {
				await crud.create( 'not-json' )
			}
			catch ( e ) {
				assert (
					e instanceof gravcrud.GravJSONValueError,
					`expected GravJSONValueError, got ${e}`
				)
			}
		} )
		
	} )
	
	after( () => {
		server.close()
	} )
} )
