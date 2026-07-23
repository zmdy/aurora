#!/bin/bash
# ==============================================================================
# Aurora for Elementor — Plugin Packaging & ZIP Builder
#
# Generates two production-ready ZIP archives:
#   1. aurora-for-elementor-full.zip  (Includes all features: GSAP, Anime.js, Motion)
#   2. aurora-for-elementor-light.zip (Lightweight: Anime.js + Motion, excludes GSAP)
#
# Designed to run on macOS.
# ==============================================================================

# Exit on any error
set -e

ROOT_DIR="$(pwd)"
TEMP_DIR="$ROOT_DIR/_dist_temp"
PLUGIN_SLUG="aurora-for-elementor"

echo "=== Starting Aurora Packaging Process ==="

# Clean up any existing temp files or zips
rm -rf "$TEMP_DIR"
rm -f "$ROOT_DIR/aurora-for-elementor-full.zip"
rm -f "$ROOT_DIR/aurora-for-elementor-light.zip"

# Create temp directories
mkdir -p "$TEMP_DIR/$PLUGIN_SLUG"

echo "-> Copying plugin files with exclusions..."
# Rsync with exclusions to avoid dev files in production packages
rsync -a --exclude='.git*' \
         --exclude='node_modules' \
         --exclude='_tests' \
         --exclude='scripts' \
         --exclude='.agents' \
         --exclude='.gemini' \
         --exclude='package.json' \
         --exclude='package-lock.json' \
         --exclude='.DS_Store' \
         --exclude='_dist_temp' \
         --exclude='*.zip' \
         "$ROOT_DIR/" "$TEMP_DIR/$PLUGIN_SLUG/"

# --- 1. BUILD FULL VERSION ---
echo "-> Building Full Version ZIP (aurora-for-elementor-full.zip)..."
cd "$TEMP_DIR"
zip -q -r "$ROOT_DIR/aurora-for-elementor-full.zip" "$PLUGIN_SLUG"
echo "✅ Full version package built successfully."

# --- 2. BUILD LIGHT VERSION ---
echo "-> Removing GSAP vendor files for the Light Version..."
# Deleting gsap.min.js triggers the plugin's internal dynamic fallback mode
rm -f "$PLUGIN_SLUG/assets/js/vendor/gsap.min.js"

echo "-> Building Light Version ZIP (aurora-for-elementor-light.zip)..."
zip -q -r "$ROOT_DIR/aurora-for-elementor-light.zip" "$PLUGIN_SLUG"
echo "✅ Light version package built successfully."

# --- CLEAN UP ---
echo "-> Cleaning up temporary files..."
cd "$ROOT_DIR"
rm -rf "$TEMP_DIR"

echo "=== Packaging completed! ==="
echo "Files generated in root:"
ls -lh aurora-for-elementor-full.zip aurora-for-elementor-light.zip
