const expect = require ( 'expect' );
const https = require ( 'https' )
const forge = require ( 'node-forge' )
const express = require( 'express' )
const bodyParser = require ( 'body-parser' )
const cookieParser = require ( 'cookie-parser' );
forge.options.usePureJavaScript = true

const sdkv1 = require ( '../gravsdk' ).sdkv1

describe ( 'SDK Tests', () => {
	
	const URL = 'https://localhost:8080'
	/**
	 * @type {DummyServer}
	 */
	let server = null
	const sdk = new sdkv1 ( URL, false )
	
	before ( () => {
		server = new DummyServer()
		server.start()
	} )
	
	it ( 'login', async () => {
		const result = await sdk.login ( 'foo', 'bar' )
		
		expect ( result ).toBe ( true )
	} )
	
	it ( 'orders', async () => {
		const result = await sdk.CRUD.read ( 'orders', {} )
		
		expect ( result.rows.length ).toBeGreaterThan ( 0 )
	} )
	
	it ( 'logout', async () => {
		const logoutResult = await sdk.logout();
		expect ( logoutResult ).toBe ( true );
	} )

	describe( 'edge cases', () => {
		
		// TODO FIXME: Clean up these
		// describe ( 'authentication', () => {
		// 	it ( 'invalid login', () => {
		// 		expect ( async() => {
		// 			await sdk.login ( 'dummy', 'dummy' )
		// 		} ).toThrowError ( 'Login error: `user not found' )
		// 	} );
			
		// 	it ( 'logout failure', () => {
		// 		expect ( async () => {
		// 			const result = await sdk.logout()
		// 			//console.log( result )
		// 		} )
		// 	} )
		// } )
		
		it ( 'not implemented protocol', () => {
			
			try {
				const sdk = new sdkv1 ( 'wss://localhost/rest' )
			}
			catch ( e ) {
				expect ( e.message ).toEqual ( 'API error: `Not Implemented`' )
			}
			
		} );
		
		it ( 'invalid protocol', () => {
			
			try {
				const sdk = new sdkv1 ( 'ssdfg://localhost/rest' )
			}
			catch ( e ) {
				expect ( e.message ).toEqual (
					'API error: `invalid protocol specified, must be `https` or `wss``'
				)
			}
			
		} );
	} );
	
	after ( () => {
		server.shutdown()
	} );
	
});

class DummyDatabase {
	constructor() {
		this._users = {
			_inc: 1,
			rows: {
				"1": {
					"USER_ID": "1",
					"USER": "foo",
					"PASSWORD": "bar",
					"FORCE_PWD_CHANGE": false,
					"LAST_ACCT": "1",
					"EXPIRED_PWD": false,
				}
			}
		}
		
		this._orders = {
			_inc: 3,
			rows: {
				"1": { id: 1, ORDER_NUM: 1 },
				"2": { id: 2, ORDER_NUM: 2 },
			}
		}
	}
	
	findUserByUsername ( username ) {
		const res = Object.values ( this._users.rows ).filter( ( x ) =>{
				return x.USER == username
			}
		)
		return res.length > 0 ? res[0] : null
	}
	
	getOrders() {
		return Object.values ( this._orders )
	}
}

class DummySessions {
	constructor() {
		this._sessions = {}
	}
	
	_sessionId() {
		var piece = () => { return Math.random().toString ( 36 ).substring ( 2, 15 ) }
		
		return piece() + piece()
	}
	
	add ( data ) {
		const id = this._sessionId()
		this._sessions[ id ] = data
		return id
	}
	
	get ( id ) {
		if ( !(id in this._sessions) )
			throw new Error ( `invalid session id` )
		return this._sessions[ id ]
	}
	
	update ( id, data ) {
		if ( !(id in this._sessions) )
			throw new Error ( `invalid session id` )
		this._sessions[ id ] = data
	}
	
	exists ( id ) {
		return id in this._sessions
	}
	
	delete ( id ) {
		if ( this.exists ( id ) )
			delete this._sessions[id]
		else
			throw new Error ( `invalid session id` )
	}
}

class DummyServer {
	
	constructor() {
		
		/**
		 * @type {Express.Application}
		 */
		this._app = express()
		this._db = new DummyDatabase()
		/**
		 * @type {https.Server}
		 */
		this._server = null
		this._sessions = new DummySessions()
	}
	
	start() {
		const self = this
		const app = this._app
		
		app.use( cookieParser() )
		app.use ( bodyParser.json() )
		app.use( ( _, res, next ) => {
			res.success = ( rows ) => {
				res.json({
					success: true,
					rows: rows
				});
				res.end()
			}
			res.failure = ( error, statusCode ) => {
				res.status ( statusCode ? statusCode : 500 )
				res.json({
					success: false,
					error: error
				});
				res.end()
			}
			next()
		} )
		app.use ( ( req, res, next ) => {
			const insecureRoutes = [
				'/rest/login',
			]
			
			if ( insecureRoutes.includes ( req.path ) ) {
				next()
				return
			}
			
			const { session } = req.cookies
			
			if ( !self._sessions.exists ( session ) ) {
				res.failure ( `access denied`, 400 )
				return
			}
			
			next()
		} )
		
		this._setupRoutes()
		
		const keys = this._generateCert()
		this._server = https.createServer ( {
			key: keys.key,
			cert: keys.cert,
		}, app )
		
		this._server.listen ( 8080 )
	}
	
	_setupRoutes() {
		const self = this
		const app = this._app
		app.get( '/rest/login', ( req, res ) => {
			const { session } = req.cookies;
			if ( this._sessions.exists ( session ) ) {
				const data = this._sessions.get ( session )
				res.success ( [ data ] )
			}
			else
				res.failure ( `no session found` )
		} )
		app.post( '/rest/login', ( req, res ) => {
			const { USER, PASSWORD } = req.body;
			const user = this._db.findUserByUsername ( USER );
			if ( !user ) {
				res.failure ( `user not found` )
				return;
			}
			
			if ( user.PASSWORD != PASSWORD ) {
				res.failure ( `invalid password` )
				return;
			}
			const sessId = this._sessions.add ( user )
			res.cookie ( 'session', sessId )
			delete user.PASSWORD
			res.success ( [ user ] )
		} )
		
		app.delete( '/rest/login', ( req, res ) => {
			const { session } = req.cookies;
			if ( this._sessions.exists ( session ) ) {
				this._sessions.delete ( session )
				res.success ( [] )
			}
			else
				res.failure ( `no session found` )
		} )
		
		app.get( '/rest/orders', ( _, res ) => {
			res.success ( self._db.getOrders() )
		} )
		
		app.post( '/rest/orders', ( req, res ) => {
			let body = req.body
			body.id = self._db._orders._inc++
			self._db._orders.rows[body.id] = body
			res.success ( [body] )
		} )
		
		app.patch( '/rest/orders/:id', ( req, res ) => {
			let order = self._db._orders.rows[ req.params.id ]
			if ( !order ) {
				res.failure ( `order id '${req.params.id}' not found` );
				return;
			}
			
			let id = order.id
			order = Object.assign( order, req.body )
			order.id = id
			success ( res, [order] )
		} )
		
		app.delete( '/rest/orders/:id', ( req, res ) => {
			if ( !( req.params.id in self._db._orders.rows ) ) {
				res.failure ( `order id '${req.params.id}' not found` );
				return;
			}
			delete self._db._orders.rows[ req.params.id ]
			res.success ( [] )
		} )
		
		app.get( '/rest/not-json', ( _, res ) => {
			res.send( '<h1>not json... shhh</h1>' )
			res.end()
		} )
	}
	
	shutdown() {
		this._server.close()
	}
	
	_generateCert() {
		var pki = forge.pki;
		var keys = pki.rsa.generateKeyPair ( 2048 );
		var cert = pki.createCertificate();

		cert.publicKey = keys.publicKey;
		cert.serialNumber = '01';
		cert.validity.notBefore = new Date();
		cert.validity.notAfter = new Date();
		cert.validity.notAfter.setFullYear ( cert.validity.notBefore.getFullYear() + 1 );

		var attrs = [
			{ name:'commonName', value:'localhost' },
			{ name:'countryName', value:'US' },
			{ shortName:'ST', value:'Texas' },
			{ name:'localityName', value:'Houston' },
			{ name:'organizationName', value:'Test' },
			{ shortName:'OU', value:'Test' },
		];
		cert.setSubject ( attrs )
		cert.setIssuer ( attrs )
		cert.sign ( keys.privateKey )

		//var pem_pkey = pki.publicKeyToPem ( keys.publicKey )
		var pemCert = pki.certificateToPem ( cert )
		var pemKey = pki.privateKeyToPem ( keys.privateKey )
		
		return { cert: pemCert, key: pemKey }
	}
}