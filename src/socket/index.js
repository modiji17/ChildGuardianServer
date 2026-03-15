module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('--- NEW SOCKET CONNECTION ---');
        console.log('Socket ID:', socket.id);

        socket.on('register-device', (data) => {
            console.log('--- REGISTRATION ATTEMPT ---');

            let deviceId = null;

            // 1. If it is a clean JSON object (This is what Android is sending now!)
            if (typeof data === 'object' && data !== null && data.deviceId) {
                deviceId = data.deviceId;
            }
            // 2. Fallback for stringified JSON
            else if (typeof data === 'string' && data.includes('{')) {
                try {
                    const parsed = JSON.parse(data);
                    deviceId = parsed.deviceId;
                } catch (e) {
                    console.log('JSON parse failed.');
                }
            }
            // 3. Fallback for raw string
            else if (typeof data === 'string') {
                deviceId = data;
            }

            if (deviceId) {
                // THE CRITICAL FIX: Strip away any invisible spaces or line breaks
                const cleanId = deviceId.trim();

                // Put the phone in the room!
                socket.join(cleanId);
                console.log(`>>> SUCCESS: Device locked in room: [${cleanId}] <<<`);

                // VERIFICATION: Ask the server if the room actually exists
                const room = io.sockets.adapter.rooms.get(cleanId);
                console.log(`>>> Room [${cleanId}] currently has ${room ? room.size : 0} occupant(s) <<<`);
            } else {
                console.log('>>> ERROR: Could not extract deviceId from data! <<<', data);
            }
        });

        // ==========================================
        // WebRTC Signaling Logic Below (Unchanged)
        // ==========================================

        socket.on('viewer-request', (data) => {
            const { deviceId } = data;
            console.log(`Viewer ${socket.id} requesting stream from ${deviceId}`);
            io.to(deviceId).emit('viewer-wants-to-connect', { viewerId: socket.id });
        });

        socket.on('offer', (data) => {
            io.to(data.viewerId).emit('offer', { offer: data.offer, targetId: socket.id });
        });

        socket.on('answer', (data) => {
            io.to(data.targetId).emit('answer', { answer: data.answer, viewerId: socket.id });
        });

        socket.on('ice-candidate', (data) => {
            io.to(data.targetId).emit('ice-candidate', { candidate: data.candidate, senderId: socket.id });
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};