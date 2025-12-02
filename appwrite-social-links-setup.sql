-- ============================================
-- Appwrite Social Links Table Setup
-- ============================================
-- This SQL file documents the structure for the social_links collection
-- Execute these steps in Appwrite Console manually
-- ============================================

-- DATABASE CONFIGURATION
-- Database ID: devpad_main
-- Database Name: DevPad Main Database

-- COLLECTION CONFIGURATION
-- Collection ID: social_links
-- Collection Name: Social Links
-- Permissions: Read access for "Any" role

-- ============================================
-- ATTRIBUTES (Create in Appwrite Console)
-- ============================================

-- 1. platform (String)
--    - Type: String
--    - Size: 50
--    - Required: Yes
--    - Description: Platform identifier (e.g., 'github', 'twitter')

-- 2. url (String)
--    - Type: String
--    - Size: 500
--    - Required: Yes
--    - Description: Full URL to the social profile

-- 3. icon (String)
--    - Type: String
--    - Size: 100
--    - Required: Yes
--    - Description: Font Awesome icon class (e.g., 'fab fa-github')

-- 4. display_name (String)
--    - Type: String
--    - Size: 100
--    - Required: Yes
--    - Description: Display name for the platform

-- 5. order (Integer)
--    - Type: Integer
--    - Required: Yes
--    - Min: 0
--    - Max: 9999
--    - Description: Sort order for displaying links

-- 6. is_active (Boolean)
--    - Type: Boolean
--    - Required: Yes
--    - Default: true
--    - Description: Whether the link is active/visible

-- ============================================
-- INITIAL DATA (Create documents in Appwrite Console)
-- ============================================

-- Document 1: GitHub
-- {
--   "platform": "github",
--   "url": "https://github.com/ramaeon",
--   "icon": "fab fa-github",
--   "display_name": "GitHub",
--   "order": 1,
--   "is_active": true
-- }

-- Document 2: Twitter
-- {
--   "platform": "twitter",
--   "url": "https://twitter.com/ramaeon",
--   "icon": "fab fa-twitter",
--   "display_name": "Twitter",
--   "order": 2,
--   "is_active": true
-- }

-- Document 3: LinkedIn
-- {
--   "platform": "linkedin",
--   "url": "https://www.linkedin.com/in/ramaeon/",
--   "icon": "fab fa-linkedin",
--   "display_name": "LinkedIn",
--   "order": 3,
--   "is_active": true
-- }

-- Document 4: npm
-- {
--   "platform": "npm",
--   "url": "https://www.npmjs.com/~ramaeon",
--   "icon": "fab fa-npm",
--   "display_name": "npm",
--   "order": 4,
--   "is_active": true
-- }

-- ============================================
-- PERMISSIONS CONFIGURATION
-- ============================================
-- Collection Permissions:
--   - Read: Role.any()
--   - Create: Role.users() [optional, if you want users to suggest links]
--   - Update: Role.users() [optional, for admin users]
--   - Delete: Role.users() [optional, for admin users]

-- Document Permissions:
--   - Read: Role.any()

-- ============================================
-- INDEXES (Optional for better performance)
-- ============================================
-- Index 1: active_links
--   - Key: is_active
--   - Type: key
--   - Attributes: is_active, order

-- Index 2: order_index
--   - Key: order
--   - Type: key
--   - Attributes: order

-- ============================================
-- SETUP INSTRUCTIONS
-- ============================================
-- 1. Go to Appwrite Console: https://cloud.appwrite.io/
-- 2. Navigate to your project (692a8520001d66741068)
-- 3. Create Database:
--    - Click "Databases" → "Create Database"
--    - Database ID: devpad_main
--    - Name: DevPad Main Database
-- 4. Create Collection:
--    - Click "Create Collection"
--    - Collection ID: social_links
--    - Name: Social Links
--    - Permissions: Add "Read" for "Any"
-- 5. Create Attributes:
--    - Click "Attributes" → "Create Attribute"
--    - Add each attribute listed above
-- 6. Create Documents:
--    - Click "Documents" → "Add Document"
--    - Copy/paste each JSON document above
-- 7. Verify:
--    - Ensure all 4 documents are created
--    - Check that permissions allow public read access
