-- Monicrop public schema. Contains no user data or credentials.

CREATE TABLE `consultant` (
  `cons_ID` int(11) NOT NULL,
  `user_ID` int(11) NOT NULL,
  `prof_name` varchar(100) NOT NULL,
  `expertise` varchar(255) DEFAULT NULL,
  `certificate` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `consultation` (
  `msg_no` int(11) NOT NULL,
  `user_ID` int(11) DEFAULT NULL,
  `cons_ID` int(11) DEFAULT NULL,
  `tmp_ID` int(2) NOT NULL,
  `sent_to` varchar(100) DEFAULT NULL,
  `sender` varchar(100) DEFAULT NULL,
  `cons_date` datetime DEFAULT NULL,
  `message` text DEFAULT NULL,
  `pictu` varchar(100) DEFAULT NULL,
  `status` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `crops` (
  `user_ID` int(11) DEFAULT NULL,
  `cropID` int(11) NOT NULL,
  `cropname` varchar(100) DEFAULT NULL,
  `variant` varchar(100) DEFAULT NULL,
  `dateplanted` date DEFAULT NULL,
  `crop_location` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `crop_log` (
  `cropID` int(11) DEFAULT NULL,
  `logID` int(11) NOT NULL,
  `log_date` datetime DEFAULT NULL,
  `growth_stage` varchar(100) DEFAULT NULL,
  `temperature` decimal(5,2) DEFAULT NULL,
  `weather` varchar(100) DEFAULT NULL,
  `lastWatering_date` varchar(100) DEFAULT NULL,
  `fertilized` varchar(10) DEFAULT NULL,
  `lastFertilization_date` varchar(100) DEFAULT NULL,
  `fertilizer_name` varchar(100) DEFAULT NULL,
  `pest_atk` varchar(10) DEFAULT NULL,
  `pest_kind` varchar(100) DEFAULT NULL,
  `lastPesticide_date` varchar(100) DEFAULT NULL,
  `pesticide_solution` varchar(100) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `harvest` varchar(10) DEFAULT NULL,
  `harvest_date` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE `users_creds` (
  `user_ID` int(11) NOT NULL,
  `user_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `pass` varchar(50) NOT NULL,
  `user_type` varchar(20) NOT NULL,
  `fname` varchar(50) DEFAULT NULL,
  `minitial` varchar(5) DEFAULT NULL,
  `lname` varchar(50) DEFAULT NULL,
  `prof_name` varchar(100) DEFAULT NULL,
  `birthdate` date DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `street` varchar(100) DEFAULT NULL,
  `barangay` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `profile_pic` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

ALTER TABLE `consultant`
  ADD PRIMARY KEY (`cons_ID`),
  ADD KEY `user_ID` (`user_ID`);

ALTER TABLE `consultation`
  ADD PRIMARY KEY (`msg_no`),
  ADD KEY `consultation_ibfk_2` (`cons_ID`),
  ADD KEY `consultation_ibfk_1` (`user_ID`);

ALTER TABLE `crops`
  ADD PRIMARY KEY (`cropID`),
  ADD KEY `crops_ibfk_1` (`user_ID`);

ALTER TABLE `crop_log`
  ADD PRIMARY KEY (`logID`),
  ADD KEY `crop_log_ibfk_1` (`cropID`);

ALTER TABLE `users_creds`
  ADD PRIMARY KEY (`user_ID`);

ALTER TABLE `consultant`
  MODIFY `cons_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

ALTER TABLE `consultation`
  MODIFY `msg_no` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

ALTER TABLE `crops`
  MODIFY `cropID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

ALTER TABLE `crop_log`
  MODIFY `logID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

ALTER TABLE `users_creds`
  MODIFY `user_ID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

ALTER TABLE `consultant`
  ADD CONSTRAINT `consultant_ibfk_1` FOREIGN KEY (`user_ID`) REFERENCES `users_creds` (`user_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `crops`
  ADD CONSTRAINT `crops_ibfk_1` FOREIGN KEY (`user_ID`) REFERENCES `users_creds` (`user_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `crop_log`
  ADD CONSTRAINT `crop_log_ibfk_1` FOREIGN KEY (`cropID`) REFERENCES `crops` (`cropID`) ON DELETE CASCADE ON UPDATE CASCADE;
