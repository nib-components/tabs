var Tabs = module.exports = function(options){
  this.el = options.el;
  this.panes = options.panes || this.el.find('.js-tab-pane');
  this.tabs = options.tabs || this.el.find('.js-tab');
  this.el.on('click', '.js-tab', _.bind(this.onTabClick, this));
  this.loaded = [];
  this.loading = [];

  // Looks for panes that already have content loaded
  this.panes.each(_.bind(function(index, el){
    if(el.getAttribute('data-tab-loaded') !== null) {
      this.hasLoaded(index);
    }
  }, this));
};

_.extend(Tabs.prototype, Backbone.Events, {

  activeClass: 'is-selected',
  errorClass: 'is-error',
  inactiveClass: 'is-hidden',
  loadingClass: 'is-loading',

  /**
   * Select a tab using the index
   * @param  {int} index Index of the tab
   * @return {mixed}
   */
  select: function(index) {

    // Already selected
    if( this.selected === index ) {
      return true;
    }

    // If we are currently loading this pane
    // then just return so we don't do anything
    if( this.isLoading(index) ) {
      return false;
    }

    this.trigger('select', index);

    // If this pane is already loaded just resolve
    // the deferred so that the tab will render
    if( this.isLoaded(index) ) {
      this.tellServerTheTabHasBeenSelected(index);
      return this.showPane(index);
    }

    // Create a deferred object for when the tab
    // has finished being loaded.
    var paneLoading = this.loadPane(index);

    paneLoading.done(_.bind(function(){
      this.showPane(index);
    }, this));

    paneLoading.fail(_.bind(function(){
      this.selected = index;
      this.getPane(index).addClass(this.errorClass);
    }, this));

    return paneLoading;
  },

  /**
   * Shows a pane and selects the tab.
   * @private
   * @param  {int} index Index of the tab/pane
   * @return {this}
   */
  showPane: function(index){
    // Disable all panes and tabs
    this.disableAll();

    // Select the current tab
    this.getTab(index).addClass(this.activeClass);

    // Select the current pane
    this.getPane(index).addClass(this.activeClass).removeClass(this.inactiveClass);

    // Store the index of the selected tab
    this.selected = index;

    return this;
  },

  /**
   * Return the pane for a tab index start from 0
   * @param  {int} index
   * @return {jQuery}
   */
  getPane: function(index) {
    return this.panes.eq(index);
  },

  /**
   * Get a tab element by index starting from 0
   * @param  {int} index
   * @return {jQuery}
   */
  getTab: function(index) {
    return this.tabs.eq(index);
  },

  /**
   * Return the current visible pane
   * @return {jQuery}
   */
  getCurrentPane: function(){
    return this.getPane(this.selected);
  },

  /**
   * Return the current active tab
   * @return {jQuery}
   */
  getCurrentTab: function(){
    return this.getTab(this.selected);
  },

  /**
   * Disables all tabs and hides all panes
   * @private
   * @return {this}
   */
  disableAll: function(){
    this.panes.removeClass(this.activeClass).addClass(this.inactiveClass);
    this.tabs.removeClass(this.activeClass);
    return this;
  },

  /**
   * Event handler for clicking on a tab
   * @private
   * @param  {event} event
   * @return {void}
   */
  onTabClick: function(event) {
    event.preventDefault();
    var tabIndex = $(event.currentTarget).index();
    this.select(tabIndex);
  },

  /**
   * Is a pane loaded already?
   * @param  {int}  index The index of the tab/pane
   * @return {Boolean}
   */
  isLoaded: function(index) {
    return _(this.loaded).contains(index);
  },

  /**
   * Is the pane currently still loading?
   * @param  {int}  index The index of the tab/pane
   * @return {Boolean}
   */
  isLoading: function(index) {
    return _(this.loading).contains(index);
  },

  /**
   * Get the URL for a tab to fetch the pane content. Throws an error if
   * a URL cant be found for a tab
   * @private
   * @param  {int} index Index of the tab/pane.
   * @return {[type]}
   */
  getTabUrl: function(index) {
    var url = this.getTab(index).find('a').attr('href');
    if(!url) {
      throw new Error('No tab URL defined.');
    }
    return url;
  },

  /**
   * Triggers loading state for a tab/pane for an index
   * @private
   * @param  {int} index Index of the tab/pane
   * @return {this}
   */
  startLoading: function(index) {
    this.getPane(index).addClass(this.loadingClass);
    this.getTab(index).addClass(this.loadingClass);
    this.loading.push(index);
    return this;
  },

  /**
   * Remove the loading state for a pane
   * @param  {int} index
   * @return {void}
   */
  stopLoading: function(index) {
    this.getPane(index).removeClass(this.loadingClass);
    this.getTab(index).removeClass(this.loadingClass);
    this.loading = _(this.loading).without(index);
  },

  /**
   * Sets the loaded state for pane content to true and removes
   * any loading state.
   * @private
   * @param  {int}  index Index of the tab/pane
   * @return {Boolean}
   */
  hasLoaded: function(index) {
    this.stopLoading(index);
    this.loaded.push(index);
    return true;
  },

  /**
   * Load the content for a tab.
   * @private
   * @param  {int} index Index of the tab/pane
   * @return {$.Deferred}
   */
  loadPane: function(index) {

    // Store this as currently loading so that further
    // call to the tab don't do anything
    this.startLoading(index);

    // Make an ajax call to get the content for this tab. The backend
    // will return the HTML for the panel
    var loading = this.tellServerTheTabHasBeenSelected(index);

    // Do this on done/fail
    loading.always(_.bind(function(){
      this.stopLoading(index);
    }, this));

    // When the loading is finished
    loading.done(_.bind(function(data){

      // Remove it as loading
      this.hasLoaded(index);

      // The response will be a HTML chunk that
      // will insert into the content of the pane
      this.getPane(index).html(data);

      // Let others know the tab has finished
      this.trigger('loaded', index);

    }, this));

    return loading;
  },

  tellServerTheTabHasBeenSelected: function(index){
    if( this._xhr && this._xhr.state() === "pending" ) {
      this._xhr.abort();
    }
    var url = this.getTabUrl(index);
    if( url === "#" ) return;
    this._xhr = $.ajax(url);
    return this._xhr;
  }

});