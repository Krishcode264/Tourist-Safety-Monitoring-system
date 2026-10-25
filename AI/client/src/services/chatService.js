// const API_URL = "http://localhost:4000/api/chat";
const API_URL = "/api/chat";

export async function streamChatResponse(
    message,
    persona,
    onChunk
) {
    const response = await fetch( API_URL, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify( {
            message,
            persona,
        } ),
    } );

    if ( !response.ok ) {
        throw new Error( "Failed to get response from server." );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    while ( true ) {
        const { done, value } = await reader.read();

        if ( done ) break;

        buffer += decoder.decode( value, { stream: true } );

        const events = buffer.split( "\n\n" );
        buffer = events.pop() || "";

        for ( const event of events ) {
            const line = event
                .split( "\n" )
                .find( ( l ) => l.startsWith( "data: " ) );

            if ( !line ) continue;

            const data = line.slice( 6 );

            if ( data === "[DONE]" ) continue;

            const parsed = JSON.parse( data );

            if ( parsed.delta ) {
                for ( const char of parsed.delta ) {
                    onChunk( char );

                    // Control typing speed
                    await new Promise( ( resolve ) =>
                        setTimeout( resolve, 18 )
                    );
                }
            }
        }
    }
}