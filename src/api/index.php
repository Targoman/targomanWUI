<?php
/**
 * Proxy for targoman API to mitigate unauthorized anonymous access to targoman API. This is only used by Targoman
 * non-profit translator Web UI.
 */

define('ALLOWED_ORIGINS', [
    'targoman.ir',
    'targoman.ty',
    'dev.targoman.com',
    'new.targoman.com'
]);
define('PROXIED_API_PATH', 'api.targoman.com/v9.5')

function proxyPassAPICall($_json) {
    if(isset($_SERVER['HTTP_ORIGIN'])) {
        $Origin = $_SERVER['HTTP_ORIGIN'];
        $IsAllowed = false;
        foreach(ALLOWED_ORIGINS as $AllowedOrigin) {
            if($Origin === "http://$AllowedOrigin" || $Origin === "https://$AllowedOrigin") {
                $IsAllowed = true;
                break;
            }
        }
        if($IsAllowed === false)
            return json_encode([
                'e' => "Invalid request from origin: `$Origin`"
            ]);
    }
    $IP = isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? $_SERVER['HTTP_X_FORWARDED_FOR'] : $_SERVER['REMOTE_ADDR'];
    $CH = curl_init();
    curl_setopt($CH, CURLOPT_URL, PROXIED_API_PATH . '/?cip=' . $IP);
    curl_setopt($CH, CURLOPT_HTTPHEADER, array("Content-Type: application/json"));
    curl_setopt($CH, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($CH, CURLOPT_TIMEOUT, 60);
    curl_setopt($CH, CURLOPT_POST, 1);
    curl_setopt($CH, CURLOPT_POSTFIELDS, $_json);

    return  curl_exec($CH);
}

# Pass the API call to targoman API
echo proxyPassAPICall(file_get_contents('php://input'));