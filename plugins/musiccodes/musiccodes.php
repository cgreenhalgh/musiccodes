<?php
/**
 * Plugin Name: musiccodes
 * Plugin URI: https://github.com/cgreenhalgh/musiccodes
 * Description: Plugin for wordpress which gives a web-based graphical interface for authoring and testing musiccodes, i.e. triggering actions from patterns within music.
 * Version: 0.1
 * Author: Chris Greenhalgh
 * Author URI: http://www.cs.nott.ac.uk/~pszcmg/
 * Network: true
 * License: AGPL-3.0
 */
/*
MusicCodes - wordpress plugin creating a GUI for musiccodes,
Copyright (c) 2015 The University of Nottingham

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
/*
 * To do:
 * - everything...
 * - add exit animation
 */

add_action( 'init', 'musiccodes_create_post_types' );
// Register the experience post type
function musiccodes_create_post_types() {
	register_post_type( 'musiccodes',
		array(
			'labels' => array(
				'name' => __( 'MusicCode Experience' ),
				'singular_name' => __( 'MusicCode Experience' ),
				'add_new_item' => __( 'Add New MusicCode Experience' ),
				'edit_item' => __( 'Edit MusicCode Experience' ),
				'new_item' => __( 'New MusicCode Experience' ),
				'view_item' => __( 'View MusicCode Experience' ),
				'search_items' => __( 'Search MusicCode Experiences' ),
				'not_found' => __( 'No MusicCode Experience found' ),
				'not_found_in_trash' => __( 'No MusicCode Experience found in Trash' ),
				'all_items' => __( 'All MusicCode Experiences' ),
			),
			'description' => __( 'MusicCode Experience view, for authoring and using MusicCodes' ),
			'public' => true,
			'has_archive' => true,
			'supports' => array( 'title', 'editor' ),
			'menu_icon' => 'dashicons-playlist-audio',
		)
	);
}

/* Adds a meta box to the post edit screen */
add_action( 'add_meta_boxes', 'musiccodes_add_custom_box' );
function musiccodes_add_custom_box() {
	add_meta_box(
		'musiccodes_box_id',        // Unique ID
		'MusicCode Experience Settings', 	    // Box title
		'musiccodes_custom_box',  // Content callback
		'musiccodes',               // post type
		'normal', 'high'
	);
}
function musiccodes_custom_box( $post ) {
	// TODO: form inputs
}
add_action( 'save_post', 'musiccodes_save_postdata' );
function musiccodes_save_postdata( $post_id ) {
	// TODO: save options
}
add_filter( 'template_include', 'musiccodes_include_template_function', 1 );
function musiccodes_include_template_function( $template_path ) {
	if ( get_post_type() == 'musiccodes' ) {
		if ( is_single() ) {
			// checks if the file exists in the theme first,
			// otherwise serve the file from the plugin
			if ( $theme_file = locate_template( array( 'single-musiccodes.php' ) ) ) {
				$template_path = $theme_file;
			} else {
				$template_path = plugin_dir_path( __FILE__ ) . '/single-musiccodes.php';
			}
		}
	}
	return $template_path;
}
// Ajax for get json...
function musiccodes_get_experience() {
	global $wpdb;
	check_ajax_referer( 'musiccodes-ajax', 'security' );
	$id = intval( $_POST['id'] ? $_POST['id'] : $_GET['id'] );
	if ( ! $id ) {
		echo '# Invalid request: id not specified';
		wp_die();
	}
	$post = get_post( $id );
	if ( $post === null ) {
		echo '# Not found: post '.$id.' not found';
		wp_die();
	}
	if ( ! current_user_can( 'read_post', $post->ID ) ) {
		echo '# Not permitted: post '.$id.' is not readable for this user';
		wp_die();
	}
	if ( $post->post_type != 'musiccodes' ) {
		echo '# Invalid request: post '.$id.' is not a musiccode experience ('.$post->post_type.')';
		wp_die();
	}
	// TODO: stuff
	header( 'Content-Type: application/json' );
	echo json_encode( FALSE );
	wp_die();
}
if ( is_admin() ) {
	add_action( 'wp_ajax_musiccodes_get_experience', 'musiccodes_get_experience' );
}

