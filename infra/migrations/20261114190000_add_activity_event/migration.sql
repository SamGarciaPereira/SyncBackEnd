-- CreateTable
CREATE TABLE `activity_event` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `medication_id` INTEGER NULL,
    `type` ENUM('ALARM', 'SOS_CALL') NOT NULL,
    `scheduled_time` VARCHAR(191) NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_event_user_id_type_occurred_at_idx`(`user_id`, `type`, `occurred_at`),
    INDEX `activity_event_medication_id_idx`(`medication_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `activity_event` ADD CONSTRAINT `activity_event_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_event` ADD CONSTRAINT `activity_event_medication_id_fkey` FOREIGN KEY (`medication_id`) REFERENCES `medication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
