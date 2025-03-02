(function() {
    function startHeartbeat() {
        sendHeartbeat();
        setInterval(sendHeartbeat, 10000);
    }
    async function sendHeartbeat() {
        try {
            await chrome.runtime.sendMessage({ type: "HEARTBEAT" });
            console.info("Sent heartbeat");
        } catch (error) {
            console.error("Failed to send heartbeat", error);
        }
    }
    document.addEventListener('DOMContentLoaded', startHeartbeat);
})();