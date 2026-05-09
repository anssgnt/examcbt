/**
 * DYNAMIC MODULE LOADER
 * Phase 5: Advanced ES Modules
 */

class ModuleLoader {
  constructor() {
    this.modules = new Map();
    this.loading = new Map();
  }

  async load(moduleName) {
    if (this.modules.has(moduleName)) {
      return this.modules.get(moduleName);
    }

    if (this.loading.has(moduleName)) {
      return this.loading.get(moduleName);
    }

    const promise = import(`/modules/${moduleName}.js`)
      .then(module => {
        this.modules.set(moduleName, module);
        this.loading.delete(moduleName);
        return module;
      })
      .catch(err => {
        this.loading.delete(moduleName);
        throw err;
      });

    this.loading.set(moduleName, promise);
    return promise;
  }

  async preload(moduleNames) {
    return Promise.all(moduleNames.map(name => this.load(name)));
  }

  has(moduleName) {
    return this.modules.has(moduleName);
  }

  get(moduleName) {
    return this.modules.get(moduleName);
  }

  clear() {
    this.modules.clear();
    this.loading.clear();
  }
}

window.moduleLoader = new ModuleLoader();
