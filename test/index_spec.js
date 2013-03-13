var Tabs = component('tabs');

describe('Tabs', function(){

  beforeEach(function(){
    var el = $('<div>');

    // Create 5 tabs
    var tab, i;
    for (i = 1; i <= 5; i++) {
      tab = $('<div class="js-tab" />');
      tab.append('<a>');
      tab.appendTo(el);
    }
    
    // Create 5 panes
    var pane;
    for (i = 1; i <= 5; i++) {
      pane = $('<div class="js-tab-pane" />');
      pane.appendTo(el);
    }

    // The last tab (index 4) has been loaded already
    el.find('.js-tab-pane').last().attr('data-tab-loaded', true);

    this.view = new Tabs({
      el: el
    });

    var urlStub = sinon.stub(this.view, 'getTabUrl');
    urlStub.returns('http://google.com');
  });

  it('should have unique loaded and loading arrays across instances', function(){
    this.view.loaded.push(0);
    var view = new Tabs({ el: this.view.el });
    expect(this.view.loaded.length).to.equal(2);
    expect(view.loaded.length).to.equal(1);
  });

  it('should know if a pane is already loaded on intialization', function(){
    expect(this.view.loaded.length).to.equal(1);
  });

  it('should return a tab by its index', function(){
    var tab = this.view.getTab(1).get(0);
    expect(_.isElement(tab)).to.equal(true);
  });

  it('should select a tab on click', function(){
    var stub = sinon.stub(this.view, 'select');
    this.view.getTab(0).click();
    expect(stub.called).to.equal(true);
  });

  it('should add a selected class when a tab is selected', function(){
    var className = this.view.activeClass;

    // Load pane returns a resolved deferred
    var deferred = new $.Deferred();
    deferred.resolve();
    var stub = sinon.stub(this.view, 'loadPane');
    stub.returns(deferred);

    // Select the tab
    this.view.select(0);

    // Should set the selected index
    expect(this.view.selected).to.equal(0);

    // The selected tab should have the class
    expect(this.view.tabs.filter('.'+className).length).to.equal(1);

    // Every other tab shouldn't have an active class
    expect(this.view.tabs.not('.'+className).length).to.equal(4);
  });

  it('should return true if the tab is already selected', function(){

    // Loading the pane will always return a resolved deferred
    var deferred = new $.Deferred();
    deferred.resolve();
    var stub = sinon.stub(this.view, 'loadPane');
    stub.returns(deferred);

    this.view.select(0);
    expect(this.view.select(0)).to.equal(true);
  });

  it('should update the selected index when the selected tab changes', function(){

    // Loading the pane will always return a resolved deferred
    var deferred = new $.Deferred();
    deferred.resolve();
    var stub = sinon.stub(this.view, 'loadPane');
    stub.returns(deferred);

    this.view.select(0);
    expect(this.view.selected).to.equal(0);
    this.view.select(1);
    expect(this.view.selected).to.equal(1);
    this.view.select(1);
    expect(this.view.selected).to.equal(1);
    this.view.select(0);
    expect(this.view.selected).to.equal(0);
  });

  it('should load the pane via ajax when selecting a tab for the first time', function(){
    var stub = sinon.stub(this.view, 'loadPane');
    stub.returns(new $.Deferred());
    this.view.select(0);
    expect(stub.called).to.equal(true);
  });

  it('should not load a pane if that pane is already loading', function(){
    this.view.startLoading(0);
    var result = this.view.select(0);
    expect(result).to.equal(false);
  });

  it('should add a loading class to a pane when it is being loaded', function(){
    this.view.startLoading(0);
    expect(this.view.getPane(0).hasClass(this.view.loadingClass)).to.equal(true);
  });

  it('should throw an error is there is no url', function(){
    this.view.getTabUrl.restore();
    var that = this;
    var fn = function(){
      that.view.getTabUrl(0);
    };
    expect(fn).throws(Error);
  });

  describe("A successful AJAX response", function(){
    var stub;

    // $.ajax always returns a successful response
    beforeEach(function(){
      stub = sinon.stub($, 'ajax');
      var deferred = new $.Deferred();
      deferred.resolve("foo");
      stub.returns(deferred);
    });

    afterEach(function(){
      stub.restore();
    });

    it('should not load a pane if it has already been loaded', function(){
      this.view.select(0);
      this.view.select(0);
      expect(stub.calledOnce).to.equal(true);
    });

    it('should trigger an event when the pane is loaded', function(){
      var spy = sinon.spy();
      this.view.on('loaded', spy);
      this.view.select(0);
      expect(spy.calledWith(0)).to.equal(true);
    });

    it('should know which panes are loaded', function(){
      this.view.select(0);
      this.view.select(1);
      this.view.select(2);
      this.view.select(4); // 4 has already been loaded due to data attribute
      expect(stub.callCount).to.equal(4);
      expect(this.view.loaded.length).to.equal(4);
    });

    it('should add the html from the response to the pane', function(){
      this.view.select(0);
      expect(this.view.getPane(0).html()).to.equal("foo");
    });

    it('should hide all other panes when a pane is selected', function(){
      this.view.select(0);
      expect(this.view.panes.filter('.is-selected').length).to.equal(1);
      expect(this.view.panes.not('.is-selected').length).to.equal(4);
    });

  });

  describe("A failed AJAX response", function(){
    var stub;

    // $.ajax always returns a successful response
    beforeEach(function(){
      stub = sinon.stub($, 'ajax');
      var deferred = new $.Deferred();
      deferred.reject();
      stub.returns(deferred);
    });

    afterEach(function(){
      stub.restore();
    });

    it('should remove the loading state', function(){
      this.view.select(0);
      var isLoading = this.view.getCurrentPane().hasClass(this.view.loadingClass) || _.contains(this.view.loading, 0);
      expect(isLoading).to.equal(false);
      expect(this.view.selected).to.equal(0);
    });

    it('should add an error class to the panel', function(){
      this.view.select(0);
      var hasError = this.view.getCurrentPane().hasClass(this.view.errorClass);
      expect(hasError).to.equal(true);
    });

    it('should not set the pane as loaded', function(){
      this.view.select(0);
      expect(this.view.isLoaded(0)).to.equal(false);
    });

  });

});