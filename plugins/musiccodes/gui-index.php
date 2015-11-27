<?php
/**
 * The template for displaying a single MusicCode Experience
 */
defined( 'ABSPATH' ) or die( 'No script kiddies please!' );

$ajax_nonce = wp_create_nonce( 'musiccodes-ajax' );

echo '<?'?>xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN"
    "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" >
<head>
        <meta charset="UTF-8">
    <title>Socket.IO chat</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font: 13px Helvetica, Arial; }
      .container { width: 600px; height: 900px; }
      .main { width: 300px; height: 600px; background: #eee; position: absolute; }
      .notelist { width: 300px; height: 600px; position: absolute; top: 0; left: 300px; overflow: scroll; }
      .list { width: 300px; height: 300px; position: absolute; top: 0; left: 600px; overflow: scroll; }
      .view { width: 300px; height: 300px; position: absolute; top: 300px; left: 600px;  }
      #viewframe { width: 100%; height: 100%; overflow: scroll; }
      .note { fill: #0f0; }
      .group { stroke: #f00; stroke-width: 1; fill-opacity: 0; }
      .code { fill: #000; }
      .codelink { cursor: pointer; background: #bbb; height: 50px; width: 90%; display: block; border: 1px solid red; margin: 5px; }
      .codeimage { width: 45px; height: 45px; }
      .codetitle { display: inline; padding: 5px; font-size: 150%; }
    </style>
  </head>
  <body>
    <div class="container">
      <svg id="main" class="main">
      </svg>
      <div class="notelist">
        <ul id="notelist"></ul>
      </div>
      <div class="list">
        <ul id="links"></ul>
      </div>
      <div class="view">
        <iframe id="viewframe"></iframe>
      </div>
    </div>
<script src="https://cdn.socket.io/socket.io-1.2.0.js"></script>
<script src="http://code.jquery.com/jquery-1.11.1.js"></script>
<script src="//d3js.org/d3.v3.min.js" charset="utf-8"></script>
<script>
  var socket = io(':3000');
</script>
<script src="<?php echo plugins_url( 'gui/client.js', __FILE__ ) ?>"></script>
<script>
  $.ajax( "<?php echo admin_url( 'admin-ajax.php' ) ?>", {
	data: { action: "musiccodes_get_experience", security: "<?php echo $ajax_nonce ?>", id: "<?php echo $post->ID ?>" },
	dataType: 'text',
		error: function(xhr, status, thrown) {
			console.log( "get error: " + status );
			alert( "Sorry, could not get data from wordpress" );
		},
		success: function(d) {
			if (d == '0' || d == '-1') {
				console.log( "wordpress ajax error response : " + d );
				alert( "Sorry, could not get data from wordpress" );
				return;
			}
			console.log( "get success: " + d );
			var experience = JSON.parse( d );
			var client = new MusicCodeClient( experience );
 		}
	});
</script>
  </body>
</html>
