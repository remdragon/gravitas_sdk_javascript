import { jstr } from "../staff/app/js/utils.js"

function query_stringify ( queryParams )
{
	const _uri = encodeURIComponent
	return Object.entries( queryParams ?? {} )
		.map( ( [k, v] ) => `${_uri( k )}=${_uri( v )}` )
		.join( '&' )
}

function url_from_endpoint_query ( endpoint, queryParams )
{
	var url = `/rest/${endpoint}`
	if ( queryParams !== null && typeof queryParams !== 'undefined' )
	{
		let q = query_stringify ( queryParams )
		if ( q.length > 0 )
			url += '?' + q
	}
	return url
}

class CRUD
{
	/**
	 * @param {String} endpoint
	 * @param {Object} queryParams
	 * @param {Object} body
	 */
	async create ( endpoint, queryParams, body )
	{
		return await this._request ( 'POST', endpoint, queryParams, body )
	}
	
	/**
	 * @param {String} endpoint
	 * @param {Object} queryParams
	 */
	async read ( endpoint, queryParams ) {
		return await this._request ( 'GET', endpoint, queryParams )
	}
	
	/**
	 * @param {String} endpoint
	 * @param {Object} queryParams
	 * @param {Object} body
	 */
	async update ( endpoint, queryParams, body ) {
		return await this._request ( 'PATCH', endpoint, queryParams, body )
	}
	
	/**
	 * @param {String} endpoint
	 * @param {Object} queryParams
	 * @param {Object} body
	 */
	async replace ( endpoint, queryParams, body ) {
		return await this._request ( 'PUT', endpoint, queryParams, body )
	}
	
	/**
	 * @param {String} endpoint
	 * @param {Object} queryParams
	 * @param {Object} body
	 */
	async delete ( endpoint, queryParams, body ) {
		return await this._request ( 'DELETE', endpoint, queryParams, body )
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
	constructor ( host, sslVerifyEnabled, testMode )
	{
		super()
		this.host = host
		this.sslVerifyEnabled = sslVerifyEnabled
		this.testMode = testMode || false
	}
	
	/**
	 * 
	 * @param {String} method get, post, delete, etc
	 * @param {String} endpoint
	 * @param {String} queryParams query string fields
	 * @param {Object} body
	 */
	async _request ( method, endpoint, queryParams, body )
	{
		let url = `${this.host}${url_from_endpoint_query ( endpoint, queryParams )}`
		
		var params = {
			method: method,
			headers: { 'Content-Type': 'application/json' },
		}
		switch ( method )
		{
			case 'GET':
				break
			
			case 'POST':
			case 'PATCH':
			case 'DELETE':
				params.body = JSON.stringify ( body )
				break
			
			default:
				console.assert ( false, `invalid method='${method}'` )
		}
		
		const response = await fetch ( url, params )
		try
		{
			var body = await response.clone().json()
		}
		catch
		{
			var text = await response.text()

			// return response text if url is a template url
			if ( /\/tpl\//g.test ( url ) ) return text
			
			// otherwise throw response text as error
			throw new Error ( `Error decoding json: ${text}` )
		}
		
		if ( !body.success ) {
			const { status, statusText } = response
			throw new Error (
				`${statusText} (${status}): ${body.error || jstr( body )}`
			)
		}

		return body
	}
	
	
	async connect()
	{
		// This function does nothing...
		// Just to make the HTTPCRUD class similar to WSSCRUD
	}
}

export class WSSCRUD extends CRUD
{
	static eventcallbacks = { 'all-event':(e,r) => {} }
	static replycallbacks = {}
	
	on_events = (e,r) => {}

	constructor ( url )
	{
		super()
		this.url = url
		this.socketEvent = null
	}
	
	generateId() {
		return uid.uid(16)
	}

	status () {
		switch ( this.wss?.readyState ) {
			case 0: return 'CONNECTING'
			case 1: return 'OPEN'
			case 2: return 'CLOSING'
			case 3: return 'CLOSED'
			default: return 'UNKNOWN'
		}
	}
	
	async connect() {
		
		return new Promise( ( resolve, reject ) => {
			// don't recreate stuffs if ws is still open
			if ( this.status() === 'OPEN' ) {
				console.log('still opened!')
				return resolve( this.socketEvent )
			}

			this.wss = new WebSocket ( this.url )
			
			this.wss.onopen = ( event ) => {
				this.socketEvent = event
				resolve( this.socketEvent )
			}
			
			this.wss.onerror = ( event ) => {
				this.socketEvent = event
				reject( this.socketEvent )
			}
			
			this.wss.onmessage = ( event ) => {
				try { var data = JSON.parse ( event.data ) }
				catch ( e ) {
					console.error(`[wss.onmessage.json-parse] ${e.message}, data='${event.data}'`)
					throw new Error ( `JSON Parse error from WebSocket: ${e.message}` )
				}
				
				try {
					// parse for events
					if ( data.event ) {
						// console.log(`[wss.onmessage.event] `, data)

						if ( !WSSCRUD.eventcallbacks[data.event] )
							throw new Error( `No event callback defined for event '${data.event}'` )

						WSSCRUD.eventcallbacks[data.event](data)
						this.on_events( data.event, data )
					}
					// parse for replies
					else {
						// console.log(`[wss.onmessage.reply] `, data)

						if ( !WSSCRUD.replycallbacks[data.id] )
							throw new Error( `No reply callback defined for reply '${data.id}'` )

						const f = data.success ? 'resolve' : 'reject'
						WSSCRUD.replycallbacks[data.id][f]( data )
					}
				} catch ( e ) {
					console.error(`[wss.onmessage] ${e.message}`)
					throw e
				}
			}
		} )
	}

	// register callback to an event
	on ( event, callback ) {
		if ( typeof callback !== 'function' )
			throw new Error( `Invalid type of callback specified: ${typeof callback}` )

		WSSCRUD.eventcallbacks[event] = callback
	}

	// remove registered callback for event
	off ( event ) {
		delete WSSCRUD.eventcallbacks[event]
	}

	// notifies server that we want to subscribe to event broadcast
	async subscribe ( event, callback ) {
		try {
			this.on( event, callback )
			await this.read(`${event}/subscribe`)
		} catch ( e ) {
			console.error( `[event.subscribe --> '${event}'] ${e.message || e.error}` )
			throw e
		}
	}

	// basically opposite of this.subscribe()
	async unsubscribe ( event ) {
		try {
			this.off( event )
			await this.read(`${event}/unsubscribe`)
		} catch ( e ) {
			console.error( `[event.unsubscribe --> '${event}'] ${e.message || e.error}` )
			throw e
		}
	}
	
	AddEventCallback( type, functions )
	{
		if( !WSSCRUD.eventcallbacks[type] ) {
			WSSCRUD.eventcallbacks[type] = functions
		} else {
			if( typeof(functions) == 'object' )
				WSSCRUD.eventcallbacks[type] = WSSCRUD.eventcallbacks[type].concat( functions )
			else
				WSSCRUD.eventcallbacks[type].append( functions )
		}
		
		return WSSCRUD.eventcallbacks[type]
	}
	
	RemoveEventCallback( type )
	{
		delete WSSCRUD.eventcallbacks[type]
	}
	
	/**
	 * 
	 * @param {String} method get, post, delete, etc
	 * @param {String} endpoint
	 * @param {String} queryParams query string fields
	 * @param {Object} body
	 */
	async _request ( method, endpoint, queryParams, body )
	{
		let url = url_from_endpoint_query ( endpoint, null )
		return new Promise ( ( resolve, reject ) => {
			
			let request = {
				id: this.generateId(),
				method: method,
				path: url,
				args: query_stringify ( queryParams ),
			}
			
			switch ( method )
			{
				case 'GET':
					break
				
				case 'POST':
				case 'PATCH':
				case 'DELETE':
					request.body = body
					break
				
				default:
					console.assert ( false, `invalid method='${method}'` )
			}

			WSSCRUD.replycallbacks[request.id] = { resolve, reject }

			try { this.wss.send ( JSON.stringify( request ) + '\n' ) }
			catch ( e ) {
				console.error(
					`[WSSCRUD._request] 'this.wss.send' has failed: ${e.message}. ` +
					"Don't forget to call WSSCRUD.connect() first."
				)
				throw e
			}
			
		} )
	}
}