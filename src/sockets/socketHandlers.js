export const registerSocketHandlers = (io, socket) => {
    // Handle joining a conversation
    socket.on("join_conversation", (conversationId) => {
        socket.join(conversationId);
        console.log(`User ${socket.user._id} joined conversation: ${conversationId}`);
    });

    // Handle leaving a conversation
    socket.on("leave_conversation", (conversationId) => {
        socket.leave(conversationId);
        console.log(`User ${socket.user._id} left conversation: ${conversationId}`);
    });

    // Handle new message
    socket.on("new_message", (data) => {
        // Broadcast to all users in the conversation
        io.to(data.conversationId).emit("receive_message", {
            ...data,
            sender: {
                _id: socket.user._id,
                firstName: socket.user.firstName,
                lastName: socket.user.lastName,
                avatar: socket.user.avatar
            }
        });
    });

    // Handle typing status
    socket.on("typing", ({ conversationId }) => {
        socket.to(conversationId).emit("user_typing", {
            userId: socket.user._id,
            firstName: socket.user.firstName
        });
    });

    // Handle stop typing
    socket.on("stop_typing", ({ conversationId }) => {
        socket.to(conversationId).emit("user_stop_typing", {
            userId: socket.user._id
        });
    });
};



