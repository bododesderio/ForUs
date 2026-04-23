import { pool } from "../db/index.js";

const chatRoomsTable = `
    CREATE TABLE IF NOT EXISTS chat_rooms (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        type ENUM('messaging', 'livestream', 'team', 'gaming', 'commerce') DEFAULT 'messaging',
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
`;

const chatMembersTable = `
    CREATE TABLE IF NOT EXISTS chat_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id VARCHAR(255),
        user_id INT,
        user_type ENUM('user', 'consultant', 'admin') DEFAULT 'user',
        role ENUM('member', 'moderator', 'admin', 'owner') DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_room_user (room_id, user_id)
    )
`;

const messagesTable = `
    CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(255) PRIMARY KEY,
        room_id VARCHAR(255),
        user_id INT,
        user_type ENUM('user', 'consultant', 'admin') DEFAULT 'user',
        message_type ENUM('regular', 'system', 'error', 'reply', 'ephemeral') DEFAULT 'regular',
        text TEXT,
        attachments JSON,
        mentioned_users JSON,
        parent_id VARCHAR(255),
        thread_participants JSON,
        reaction_counts JSON,
        reply_count INT DEFAULT 0,
        stream_message_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
        INDEX idx_room_created (room_id, created_at),
        INDEX idx_user_created (user_id, created_at),
        INDEX idx_parent_id (parent_id)
    )
`;

const messageReactionsTable = `
    CREATE TABLE IF NOT EXISTS message_reactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id VARCHAR(255),
        user_id INT,
        user_type ENUM('user', 'consultant', 'admin') DEFAULT 'user',
        reaction_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_message_user_reaction (message_id, user_id, reaction_type)
    )
`;

const activitiesQuery = `
    CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        role ENUM('user', 'consultant', 'admin') NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;

const eventQuery = `
    CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date DATETIME NOT NULL,
        location VARCHAR(255),
        organizer VARCHAR(255),
        status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
`;

const reviewQuery = `
    CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id INT NOT NULL,
        user_id INT NOT NULL,
        consultant_id INT NOT NULL,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        review_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (consultant_id) REFERENCES consultants(id) ON DELETE CASCADE,
        UNIQUE KEY unique_review (appointment_id, user_id)
    )
`;

const appointmentsQuery = `
    CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        consultant_id INT NOT NULL,
        title VARCHAR(255) DEFAULT 'Blocked time slot',
        description TEXT,
        duration_minutes INT DEFAULT 60,
        status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'blocked', 'in_session') DEFAULT 'pending',
        cancellation_reason TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        appointment_datetime VARCHAR(30),
        mood INT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (consultant_id) REFERENCES consultants(id) ON DELETE CASCADE
    )
`;

const consultantsQuery = `
    CREATE TABLE IF NOT EXISTS consultants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        experience INT DEFAULT 0,
        language VARCHAR(100),
        education VARCHAR(255),
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        role ENUM('consultant') DEFAULT 'consultant',
        profession VARCHAR(100),
        dob DATE,
        profile_image VARCHAR(255),
        gender ENUM('male', 'female', 'other', 'prefer_not_to_say'),
        available_from TIME DEFAULT '09:00:00',
        available_to TIME DEFAULT '17:00:00',
        rating DECIMAL(3,2) DEFAULT 0.00,
        available_days JSON DEFAULT ('["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        push_token VARCHAR(255),
        push_notifications_enabled BOOLEAN DEFAULT TRUE
    )
`;

const adminQuery = `
    CREATE TABLE IF NOT EXISTS admin (
        id INT PRIMARY KEY AUTO_INCREMENT,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        experience INT DEFAULT 0,
        language VARCHAR(100),
        education VARCHAR(255),
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'super_admin') DEFAULT 'admin',
        profession VARCHAR(100),
        dob DATE,
        profile_image VARCHAR(255),
        gender ENUM('male', 'female', 'other', 'prefer_not_to_say'),
        department VARCHAR(100),
        access_level ENUM('basic', 'moderate', 'full') DEFAULT 'basic',
        last_login TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        push_token VARCHAR(255)
    )
`;

const userQuery = `
    CREATE TABLE IF NOT EXISTS users ( 
        id INT PRIMARY KEY AUTO_INCREMENT,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        username VARCHAR(100) UNIQUE NOT NULL, 
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        role ENUM('user') DEFAULT 'user',
        dob DATE,
        profile_image VARCHAR(255),
        gender ENUM('male', 'female', 'other', 'prefer_not_to_say'),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        push_token VARCHAR(255),
        push_notifications_enabled BOOLEAN DEFAULT TRUE
    )
`;

const moodsQuery = `
    CREATE TABLE IF NOT EXISTS moods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        mood_date DATE NOT NULL,
        mood INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_date (user_id, mood_date)
    )
`;

const notificationsQuery = `
    CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        consultant_id INT,
        title VARCHAR(255),
        body TEXT,
        data JSON,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;

const refreshTokensQuery = `
    CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        token VARCHAR(512),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`;

const resourcesQuery = `
    CREATE TABLE IF NOT EXISTS resources (
        id INT AUTO_INCREMENT PRIMARY KEY,
        consultant_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        type ENUM('book', 'article', 'music', 'audio', 'podcast', 'routine', 'video', 'image') NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        preview_image_url VARCHAR(500),
        author VARCHAR(255),
        duration VARCHAR(50),
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        downloads INT DEFAULT 0,
        rating FLOAT DEFAULT 0,
        FOREIGN KEY (consultant_id) REFERENCES consultants(id)
    )
`;

const createTable = async (tableName, query) => {
    try {
        await pool.query(query);
        console.log(`${tableName} table created successfully.`)   
    } catch (error) {
        console.log(error)
    }
}

const createAllTables = async() => {
    try {
        await createTable('Users', userQuery);
        await createTable('Admin', adminQuery);
        await createTable('Consultants', consultantsQuery);
        await createTable('Appointments', appointmentsQuery);
        await createTable('Reviews', reviewQuery);
        await createTable('Events', eventQuery);
        await createTable('Activities', activitiesQuery);
        await createTable('Moods', moodsQuery);
        await createTable('Notifications', notificationsQuery);
        await createTable('Refresh Tokens', refreshTokensQuery);
        await createTable('Resources', resourcesQuery);
        await createTable('Chat Rooms', chatRoomsTable);
        await createTable('Chat Members', chatMembersTable);
        await createTable('Messages', messagesTable);
        await createTable('Message Reactions', messageReactionsTable);
        console.log('All tables created successfully.')
    } catch (error) {
        console.log('Error during table creation: ', error)
    }
}

export {createTable, createAllTables};
