import { Dialog, type QDialogOptions } from "quasar";

export async function createDialog<T>(options: QDialogOptions) {
  return new Promise<T | undefined>((res) => {
    Dialog.create({
      ...options,
    })
      .onOk((value: T) => {
        res(value);
      })
      .onCancel(() => {
        res(undefined);
      })
      .onDismiss(() => {
        res(undefined);
      });
  });
}
