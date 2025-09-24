export default class ZIndexCalcurator {
  constructor(
    //文字列じゃなくて、抽象化したい。 equalsでもできるようにしたい。
    readonly ids: string[],
    readonly pinnedId: string | undefined = undefined //readonly bottomId: string | undefined //あとで:
  ) {
    //後ほど上が普通
  }

  setPin(id: string | undefined) {
    if (id === undefined) {
      return new ZIndexCalcurator(this.ids, undefined);
    }

    if (!this.includes(id)) {
      throw new Error(
        `#${id}はid一覧に含まれていないため、トップに設定できません`
      );
    }

    return new ZIndexCalcurator(this.ids, id);
  }

  moveToTop(id: string) {
    if (!this.includes(id)) {
      throw new Error(
        `#${id}はid一覧に含まれていないため、トップに移動できません`
      );
    }

    const ids = this.ids.filter((i) => i !== id);
    ids.push(id);

    return new ZIndexCalcurator(ids, this.pinnedId);
  }

  includes(id: string) {
    return this.ids.includes(id);
  }

  get(id: string) {
    if (id === this.pinnedId) {
      return this.maxTopZIndex;
    }

    return this.ids.indexOf(id);
  }

  isTop(id: string) {
    return this.ids[this.ids.length - 1] === id;
  }

  //deprecated
  get maxNormalZIndex() {
    return this.ids.length - 1;
  }

  get maxTopZIndex() {
    return this.maxNormalZIndex + (typeof this.pinnedId === "string" ? 1 : 0);
  }

  get size() {
    return this.ids.length;
  }

  get max() {
    return this.size - 1;
  }
}
