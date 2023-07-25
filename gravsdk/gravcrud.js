import {
	jstr,
	jparse,
	instance,
	_d
} from "../staff/app/js/utils.js"
import { RequestError } from '/js/Errors.js'

export function ParseRequestStack()
{
	let stack = []
	try {
		stack = (new Error()).stack.split('\n')
	} catch ( e ) { }
	let slicer = 4
	if( stack.join('\n').search( /sdkv1endpoint|ordersendpoint|sdkv1cti/m)  != -1 ) // Subject for Improvement
		slicer = 5
	stack.splice( 0, slicer )
	return stack.join('\n')
}

export function query_stringify ( queryParams ) {
	const _uri = encodeURIComponent
	return Object.entries( queryParams || {} )
		.map( ( [ k, v ] ) => `${ _uri( k ) }=${ _uri( v ) }` )
		.join( '&' )
}

export function url_from_endpoint_query ( endpoint, queryParams, overrideEP = false ) {
	var url = overrideEP?endpoint:`/rest/${ endpoint }`
	if ( queryParams ) {
		let q = query_stringify ( queryParams )
		if ( q.length > 0 )
			url += '?' + q
	}
	return url
}

export function clean_endpoint_qargs ( endpoint, qargs={} ) {
	// if endpoint has query string, put items in qargs instead
	if ( instance( endpoint ) === 'string' && endpoint.includes( '?' ) ) {
		var [endpoint, qstring] = endpoint.split('?')
		const param = new URLSearchParams(qstring)
		for ( const [k, v] of param.entries() )
			(qargs || (qargs={}))[k] = v
	}
	return [ endpoint, qargs ]
}

export function wsNoHandler ( refId, message, type='reply' ) {
	Alert.errorCode({
		title : 'Websocket Global Handler',
		caption : `No defined callback for ${ type } with id='${ refId }'`,
		message
	})
}

export function wsError ( caption, message ) {
	console.error( message )
	Alert.errorCode({
		title : 'Websocket Error',
		caption,
		message
	})
	if( $loading )
		$loading.hide()
}

class CRUD {
	presetCookies = null
	/**
	 * @param {String} endpoint
	 * @param {Object} queryParams
	 * @param {Object} body
	 */
	async create ( ...params ) {
		return await this._request( 'POST', ...params )
	}
	
	/**
	 * @param {String} endpoint
	 * @param {Object} queryParams
	 */
	async read ( ...params ) {
		return await this._request( 'GET', ...params )
	}
	
	/**
	 * @param {String} endpoint
	 * @param {Object} queryParams
	 * @param {Object} body
	 */
	async update ( ...params ) {
		return await this._request( 'PATCH', ...params )
	}
	
	/**
	 * @param {String} endpoint
	 * @param {Object} queryParams
	 * @param {Object} body
	 */
	async replace ( ...params ) {
		return await this._request( 'PUT', ...params )
	}
	
	/**
	 * @param {String} endpoint
	 * @param {Object} queryParams
	 * @param {Object} body
	 */
	async delete ( ...params ) {
		return await this._request( 'DELETE', ...params )
	}
}

export class HTTPCRUD extends CRUD
{
	/**
	 * @param {String} host
	 * @param {Boolean} sslVerifyEnabled
	 * @param {Boolean|undefined} testMode
	 * 
	 * */
	constructor ( host, sslVerifyEnabled, testMode ) {
		super()
		this.host = host
		this.sslVerifyEnabled = sslVerifyEnabled
		this.testMode = testMode || false
	}
	
	/**
	 * 
	 * @param {String} method get, post, delete, etc
	 * @param {String} endpoint
	 * @param {Object} queryArgs
	 * @param {Object} body
	 * @param {Boolean} overrideEP
	 */
	 async _request ( method, endpoint, queryArgs, body, overrideEP = false ) {
		[endpoint, queryArgs] = clean_endpoint_qargs( endpoint, queryArgs )
		let _stack = ParseRequestStack()
		
		const url = `${ this.host }${ url_from_endpoint_query( endpoint, queryArgs, overrideEP ) }`
		const headers = new Headers()
		!!this.presetCookies && headers.set( 'Cookie', this.presetCookies )
		headers.set( 'Content-Type', "application/json" )
		const payload = {
			headers,
			method : method,
			body : method !== 'GET' ? jstr( body ) : undefined
		}
		
		const response = await fetch ( url, payload )
		try {
			var data = await response.clone().json()
			if( typeof data == 'object' ) 
				data.headers = response.headers
		} catch {
			var data = await response.text()
			// return response text if url is a template url
			if ( /\/tpl\//g.test ( url ) ) return data
			// otherwise throw response text as error
			throw new Error ( `Error decoding json: ${ jstr( data ) }` )
		}
		
		if ( !data.success && !queryArgs?.raw ) {
			const { status, statusText } = response
			data.name = `HTTP-${ status }`
			_stack = `    at ${ url }\n`+ _stack
			throw new RequestError ( data, _stack, data.error || jstr( data ) )
		}

		return data
	}
}

export class WSSCRUD extends CRUD {
	constructor ( url ) {
		super()
		this.url = url
		this.eventcallbacks = {}
		this.replycallbacks = {}
	}
	
	on_events () {} // user can override, called on every event
	generateId () { return uid.uid(16) }
	
	status () {
		switch ( this.wss?.readyState ) {
			case 0 : return 'CONNECTING'
			case 1 : return 'OPEN'
			case 2 : return 'CLOSING'
			case 3 : return 'CLOSED'
			default : return 'UNKNOWN'
		}
	}
	
	connect () {
		const self = this
		return new Promise( ( resolve, reject ) => {
			// don't recreate stuffs if ws is still open
			if ( self.status() === 'OPEN' )
				return resolve( self.wss )
			
			// initiate new ws connection
			self.wss = new WebSocket ( self.url )
			self.wss.onopen = () => {
				// onopen callback has been called
				// but we have to wait for ws to be in full OPEN state
				const t = setInterval(() => {
					if (self.status() === 'OPEN') {
						clearInterval(t)
						return resolve(self.wss)
					}
				}, 10)
			}
			self.wss.onerror = () => _d(() => reject( `WebSocket connection to '${self.url}' failed` ), 100)
			self.wss.onmessage = ( event ) => {
				const data = jparse( event.data )
				if ( !data ) return
				
				if ( data.event ) { // parse for events
					self.eventcallbacks[data.event]?.call( self, data )
					self.on_events?.call( self, data.event, data )
				} else { // parse for replies
					const k = data.success ? 'resolve' : 'reject'
					const q = (self.replycallbacks[data.id] || {})[k]
					if (!q) wsNoHandler(data.id, jstr(data))
					q?.call(self, data)
				}
			}
		} )
	}

	// register callback to an event
	on ( event, callback ) {
		if ( instance( callback ) !== 'function' )
			throw new Error( `Invalid type of callback specified: ${ typeof callback }` )
		
		this.eventcallbacks[ event ] = callback
	}

	// remove registered callback for event
	off ( event ) {
		delete this.eventcallbacks[ event ]
	}

	// notifies server that we want to subscribe to event broadcast
	async subscribe ( event, callback ) {
		try {
			this.on( event, callback )
			await this.read(`${ event }/subscribe`)
		} catch ( e ) {
			console.error( `[event.subscribe --> '${ event }'] ${ e.message || e.error }` )
			throw e
		}
	}

	// basically opposite of this.subscribe()
	async unsubscribe ( event ) {
		try {
			this.off( event )
			await this.read(`${ event }/unsubscribe`)
		} catch ( e ) {
			console.error( `[event.unsubscribe --> '${ event }'] ${ e.message || e.error }` )
			throw e
		}
	}
	
	// Todo Fixme: Legacy stuff
	AddEventCallback( type, functions ) {
		if ( !this.eventcallbacks[ type ] ) {
			this.eventcallbacks[ type ] = functions
		} else {
			if ( typeof( functions ) == 'object' )
				this.eventcallbacks[ type ] = this.eventcallbacks[ type ].concat( functions )
			else
				this.eventcallbacks[ type ].append( functions )
		}
		
		return this.eventcallbacks[ type ]
	}
	
	// Todo Fixme: Legacy stuff
	RemoveEventCallback( type ) {
		delete this.eventcallbacks[ type ]
	}
	
	/**
	 * 
	 * @param {String} method get, post, delete, etc
	 * @param {String} endpoint
	 * @param {Object} queryArgs
	 * @param {Object} body
	 * @param {Boolean} overrideEP
	 */
	_request ( method, endpoint, queryArgs, body, overrideEP = false ) {
		[endpoint, queryArgs] = clean_endpoint_qargs( endpoint, queryArgs )
		let _stack = ParseRequestStack(),
		self = this
		
		if ( instance(queryArgs) === 'object' ) {
			Object.entries(queryArgs)
				.map(([a,b]) => {
					if ( instance(b) === 'boolean' ) return
					queryArgs[a]=`${b}`
				})
			if ( !Object.keys( queryArgs ).length )
				queryArgs = null
		}
		
		return new Promise ( async ( resolve, reject ) => {
			const _resolve = resolve
			const _reject = reject
			const request = {
				id : this.generateId(),
				method : method,
				path : overrideEP? endpoint:`/rest/${endpoint}`,
				args : queryArgs ?? undefined,
				body : method !== 'GET' ? body : undefined
			}
			
			this.replycallbacks[ request.id ] = {
				resolve: function ( data ) {
					if ( data?.args?.raw )
						return _resolve( data?.rows[0] )
					return resolve( data )
				},
				reject : function ( data ) {
					data.name = `WS-${ data.status }`
					const url = `${ self.url.replace('/ws', '').replace('wss://', 'https://') }${ url_from_endpoint_query( endpoint, queryArgs, overrideEP ) }`
					_stack = `    at ${ url }\n`+ _stack
					return _reject( new RequestError( data, _stack, data.error ) )
				}
			}
			
			try {
				await this.connect()
				this.wss.send ( `${ jstr( request ) }\n` )
			} catch ( e ) {
				wsError( 'Websocket send has failed', e.message || jstr( e ) )
			}
		} )
	}
}
