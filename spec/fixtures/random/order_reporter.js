export default class OrderReporter {
  specStarted(event) {
    console.log('spec started:', event.fullName);
  }
}