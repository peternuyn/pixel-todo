package com.leapandbound;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

// @EnableScheduling turns on Spring's task-scheduling support. It does two
// things we need: it lets us run code later at a chosen time (the room timer
// schedules a one-shot "the clock hit zero" job for ends_at), and it registers
// a default TaskScheduler bean that RoomTimerService can inject to do that.
@EnableScheduling
@SpringBootApplication
public class StudyfarmApplication {

	public static void main(String[] args) {
		SpringApplication.run(StudyfarmApplication.class, args);
	}

}
