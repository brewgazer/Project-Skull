// ObjectPool
// ----------------------------------------------------------------------------
// Generic allocation-free object pool. Used to recycle short-lived gameplay
// objects (projectiles, debris, floating score text) so we avoid GC spikes and
// hold a steady 60 FPS during heavy combat.

export class ObjectPool {
  /**
   * @param {() => any} factory     creates a fresh object
   * @param {(o:any)=>void} reset    prepares a recycled object for reuse
   * @param {number} prealloc        how many to allocate up front
   */
  constructor(factory, reset, prealloc = 0) {
    this.factory = factory;
    this.reset = reset;
    this.free = [];
    this.active = new Set();
    for (let i = 0; i < prealloc; i++) this.free.push(factory());
  }

  acquire(...args) {
    const obj = this.free.pop() ?? this.factory();
    this.reset(obj, ...args);
    this.active.add(obj);
    return obj;
  }

  release(obj) {
    if (!this.active.has(obj)) return;
    this.active.delete(obj);
    this.free.push(obj);
  }

  releaseAll() {
    for (const obj of this.active) this.free.push(obj);
    this.active.clear();
  }

  get size() {
    return this.active.size + this.free.length;
  }
}
