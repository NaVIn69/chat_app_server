const corsOptions = {
    origin:[
      "http://localhost:5173",
      "https://chat-app-clients.vercel.app",
         process.env.CLIENT_URL,
        
      ],
      methods:["GET","POST","PUT","DELETE"],
      credentials:true,
      // due to credential true, we can send from anything header 
    };
    const CHAT_TOKEN="chat-token";
    const chattu_admin_token="chattu-admin-token"

    export {corsOptions,CHAT_TOKEN,chattu_admin_token}