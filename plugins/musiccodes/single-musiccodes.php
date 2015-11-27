<?php
/**
 * Standard view of musiccodes, based on Twenty_Fifteen single
 */

if ( array_key_exists( 'showgui', $_REQUEST ) ) {
	require( dirname( __FILE__ ) . '/custom-musiccodes.php' );
	return;
}

wp_enqueue_style( 'musiccodes-css', plugins_url( 'single-musiccodes.css', __FILE__ ) );

get_header(); ?>

	<div id="primary" class="content-area">
		<main id="main" class="site-main" role="main">

		<?php
		// Start the loop.
		while ( have_posts() ) : the_post();

			/*
			 * Include the post format-specific template for the content. If you want to
			 * use this in a child theme, then include a file called called content-___.php
			 * (where ___ is the post format) and that will be used instead.
			 */
			get_template_part( 'content', get_post_format() );

			$view_url = get_permalink( $post->ID );
			if ( strpos( $view_url, '?' ) === false ) {
				$view_url .= '?showgui';
			} else {
 				$view_url .= '&showgui'; }

?>
<script language="javascript" type="text/javascript">
function popupqr(url) {
	var win=window.open('http://chart.googleapis.com/chart?cht=qr&chs=300x300&choe=UTF-8&chld=H&chl='+encodeURIComponent(url),'qr','height=300,width=300,left='+(screen.width/2-150)+',top='+(screen.height/2-150)+',titlebar=no,toolbar=no,location=no,directories=no,status=no,menubar=no');
	if (window.focus) {win.focus()}
	return false;
}
</script>
	<div class="comments-area musiccodes-links">
		<div class="">
			<h2>MusicCode Experience</h2>
			<p><a class="musiccodes-link" href="<?php echo $view_url ?>">Open in Browser</a>
			<a class="musiccodes-link-qr" onclick="return popupqr('<?php echo $view_url ?>')">QR</a></p>
		</div>
	</div>
<?php
			// If comments are open or we have at least one comment, load up the comment template.
if ( comments_open() || get_comments_number() ) :
	comments_template();
			endif;

			// Previous/next post navigation.
if ( function_exists( 'the_post_navigation' ) ) {
	the_post_navigation( array(
		'next_text' => '<span class="meta-nav" aria-hidden="true">' . __( 'Next', 'twentyfifteen' ) . '</span> ' .
			'<span class="screen-reader-text">' . __( 'Next post:', 'twentyfifteen' ) . '</span> ' .
			'<span class="post-title">%title</span>',
		'prev_text' => '<span class="meta-nav" aria-hidden="true">' . __( 'Previous', 'twentyfifteen' ) . '</span> ' .
			'<span class="screen-reader-text">' . __( 'Previous post:', 'twentyfifteen' ) . '</span> ' .
			'<span class="post-title">%title</span>',
	) );
}
		// End the loop.
		endwhile;
		?>

		</main><!-- .site-main -->
	</div><!-- .content-area -->

<?php get_footer(); ?>
