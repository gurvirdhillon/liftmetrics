CREATE TABLE msg(
    message_id PRIMARY KEY gen_random_uuid(),
    user_id VARCHAR(100),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(user_id)

)