export async function GET(){return Response.json({error:'device_only_chat',message:'El contenido del chat vive únicamente en los dispositivos de los participantes.'},{status:410})}
export async function POST(){return Response.json({error:'device_only_chat',message:'CitaFuego no acepta ni almacena contenido de chat en el backend.'},{status:410})}
