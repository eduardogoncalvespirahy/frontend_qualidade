export class ModalRef<TResult = any> {
  private resolveFn!: (value: TResult | undefined) => void;

  readonly result = new Promise<TResult | undefined>((resolve) => {
    this.resolveFn = resolve;
  });

  close(data?: TResult) {
    this.resolveFn(data);
  }
}
