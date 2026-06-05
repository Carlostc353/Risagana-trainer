class Scheduler {
  constructor() {
    this.timer = null;
  }

  start(minutes, callback) {
    this.callback = callback;
    this.interval = minutes;
    this._schedule();
  }

  restart(minutes, callback) {
    this.callback = callback;
    this.interval = minutes;
    this._schedule();
  }

  _schedule() {
    this._clear();
    this.timer = setTimeout(() => {
      if (this.callback) this.callback();
      this._schedule();
    }, this.interval * 60 * 1000);
  }

  _clear() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

module.exports = Scheduler;
