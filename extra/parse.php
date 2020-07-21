<?php
require_once('vendor/autoload.php');

$jsonStream = \JsonMachine\JsonMachine::fromFile("./www.instagram.com.har", "/log/entries" /* <- Json Pointer */);

$i=0;
foreach ($jsonStream as $name => $data) {
  if($data['_resourceType'] === 'image'){
    $Request = $data['request']['url'];
    $Response = $data['response']['content']['text'];

    $Image = preg_replace("/^.*\\/([0123456789_]+n\\.jpg).*/","$1", $Request);
    file_put_contents("vc/".$Image, base64_decode($Response));
    $i++;
    echo "$i $Image\n";
  }
}
 
