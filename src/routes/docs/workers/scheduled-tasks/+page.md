# Scheduled Tasks

Scheduled tasks are tasks that are executed at a specific time or interval. They are useful for running tasks that need to be executed at a specific time, such as sending emails, cleaning up data, or running reports.

OpenWorkers provides a simple way to create and manage scheduled tasks using the `schedule` event.

## Scheduled Event

The `schedule` event provides the following properties and methods:
 - `scheduledTime`: The time at which the task is scheduled to run.
 - `waitUntil`: A method to wait for the completion of the task. It is important to call this method to ensure that the task is completed before the worker is terminated. All pending promises must be resolved before the worker is terminated (they will be cancelled otherwise).

```typescript
interface ScheduledEvent {
  waitUntil: (handler: Promise<any>) => void;
  scheduledTime: number;
}
```

## Scheduling a task

To schedule a task, you must set a CRON expression or an interval for the task in the "Cron Triggers" worker configuration.

![Environment variables](/images/cron.png)

## Handling the `schedule` event

To handle a scheduled task, you need to listen for the `schedule` event. This event is triggered at the specified time or interval.

```typescript
addEventListener('scheduled', (event: ScheduledEvent) => {
  event.waitUntil(handleSchedule(event.scheduledTime));
});

async function handleSchedule(scheduledTime: number): Promise<void> {
  // Your task logic here
}
```
