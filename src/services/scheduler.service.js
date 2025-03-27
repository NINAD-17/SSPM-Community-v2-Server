import schedule from 'node-schedule';
import InactiveUserService from './inactiveUsers.service.js';

/**
 * Service for scheduling recurring tasks in the application
 * Uses node-schedule to manage cron jobs
 */
class SchedulerService {
  // Store scheduled jobs for reference
  static jobs = {};

  /**
   * Initialize all scheduled jobs
   */
  static initializeJobs() {
    this.scheduleInactiveUserNotifications();
    
    console.log('All scheduled jobs have been initialized');
  }

  /**
   * Schedule the job to send notifications to inactive users
   * Runs weekly on Sunday at 2:00 AM to minimize impact on system performance
   */
  static scheduleInactiveUserNotifications() {
    // Schedule using cron format: '0 2 * * 0' means "At 2:00 AM, only on Sunday"
    // Second (0-59), Minute (0-59), Hour (0-23), Day of Month (1-31), Month (0-11), Day of Week (0-6) (Sunday=0)
    this.jobs.inactiveUserNotifications = schedule.scheduleJob('0 2 * * 0', async function() {
      console.log('Running scheduled job: Inactive user notifications - ' + new Date().toISOString());
      
      try {
        const result = await InactiveUserService.processInactiveUsers();
        console.log('Inactive user notifications completed:', result);
      } catch (error) {
        console.error('Error running inactive user notifications job:', error);
      }
    });
    
    console.log('Scheduled inactive user notifications job');
  }

  /**
   * Run the inactive user notification job manually
   * Useful for testing or manual triggering
   */
  static async runInactiveUserNotificationsManually() {
    console.log('Manually running inactive user notifications job - ' + new Date().toISOString());
    
    try {
      const result = await InactiveUserService.processInactiveUsers();
      console.log('Inactive user notifications completed:', result);
      return result;
    } catch (error) {
      console.error('Error running inactive user notifications job:', error);
      throw error;
    }
  }

  /**
   * Cancel all scheduled jobs
   * Useful when shutting down the application
   */
  static cancelAllJobs() {
    Object.values(this.jobs).forEach(job => {
      if (job && typeof job.cancel === 'function') {
        job.cancel();
      }
    });
    
    console.log('All scheduled jobs have been cancelled');
  }
}

export default SchedulerService; 