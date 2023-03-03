d3.selection.prototype.saveState = function (manager) {
  this.each(function () {
    manager.save(d3.select(this));
  });
  return this;
};

d3.selection.prototype.trackedTransition = function (manager) {
  return this.transition().each(() =>
    manager.incrementNumberOfActiveTransitions()
  );
};

export function endTracking(manager, selection) {
  manager.save(d3.select(selection));
  manager.decrementNumberOfActiveTransitions();
}

export function hide(selection) {
  d3.select(selection).attr("display", "none");
}

export function createOnce(id, customFunction) {
  if (!document.getElementById(id)) {
    customFunction();
  } else {
    const d3Id = "#" + id;
    d3.select(d3Id).attr("display", "block");
  }
}

export class TransitionsManager {
  #step = 0;
  #numberOfActiveTransitions = 0;
  #attributeValuesPerElement = new Map();
  #changedElementsPerStep = [];

  constructor(numberOfSteps) {
    for (let i = 0; i < numberOfSteps; i++)
      this.#changedElementsPerStep[i] = [];
  }

  #revertStep() {
    let idList = this.#changedElementsPerStep[this.#step + 1];
    idList.map((id) => this.#resetToPrevState(d3.select("#" + id)));
    this.#changedElementsPerStep[this.#step + 1] = [];
  }

  drawStepWithAutoReverse(back, customFunction) {
    if (back) this.#revertStep();
    else customFunction();
  }

  getStep() {
    return this.#step;
  }
  incrementStep() {
    ++this.#step;
  }
  decrementStep() {
    --this.#step;
  }

  getNumberOfActiveTransitions() {
    return this.#numberOfActiveTransitions;
  }
  incrementNumberOfActiveTransitions() {
    ++this.#numberOfActiveTransitions;
  }
  decrementNumberOfActiveTransitions() {
    --this.#numberOfActiveTransitions;
  }

  /* 
  pushes list of new attributes to object in array attributeValuesPerElement
  if not existing creates a new entry
  last entry in attrs array are the newest attributes
*/
  save(selection) {
    const id = selection.attr("id");
    let element = document.getElementById(id);

    let list = [];
    for (let i = 0; i < element.attributes.length; i++) {
      if (element.attributes[i].nodeName !== "id")
        list.push([
          element.attributes[i].nodeName,
          element.attributes[i].nodeValue,
        ]);
    }

    const attrsList = this.#attributeValuesPerElement.get(id);
    if (!attrsList) this.#attributeValuesPerElement.set(id, [list]);
    else attrsList.push(list);

    this.#addIdToStep(id);
  }

  #addIdToStep(id) {
    const idList = this.#changedElementsPerStep[this.#step];
    if (!idList.includes(id)) {
      idList.push(id);
    }
  }

  /*
  resets selection to previous state
  if only one previous state is left, display ist set to none
*/
  #resetToPrevState(selection) {
    const id = selection.attr("id");

    if (selection.attr("display") === "none")
      selection.attr("display", "block");

    const attrs = this.#attributeValuesPerElement.get(id);
    const prevAttrs = attrs[attrs.length - 2];

    const selectionWithTransition = selection
      .trackedTransition(this)
      .on("end", () => {
        attrs.pop();
        if (attrs.length === 1) {
          selection.attr("display", "none");
        }
        this.decrementNumberOfActiveTransitions();
      });

    for (let i = 0; i < prevAttrs.length; i++) {
      selectionWithTransition.attr(prevAttrs[i][0], prevAttrs[i][1]);
    }
  }
}
